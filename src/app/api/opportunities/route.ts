import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { opportunities, activityLog, type NewOpportunity } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { publishEvent } from "@/lib/realtime";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Verify either Clerk session (browser) or service token (Signal Scout)
async function authorize(req: NextRequest): Promise<string | null> {
  // Service-to-service: custom API key header (avoids Clerk Bearer token interception)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    if (apiKey === process.env.PIPELINE_API_SECRET) {
      return "signal-scout";
    }
    return null;
  }

  // Browser: Clerk session
  const { userId } = await auth();
  return userId;
}

export async function GET(req: NextRequest) {
  const caller = await authorize(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stage = req.nextUrl.searchParams.get("stage");
  const company = req.nextUrl.searchParams.get("company");

  const all = await db.query.opportunities.findMany({
    where: stage
      ? eq(opportunities.stage, stage as any)
      : company
      ? sql`LOWER(${opportunities.companyName}) = LOWER(${company})`
      : undefined,
    orderBy: (o, { desc }) => [desc(o.createdAt)],
  });

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const caller = await authorize(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.companyName) {
    return NextResponse.json({ error: "companyName is required" }, { status: 400 });
  }

  // Duplicate detection: check for existing company (case-insensitive)
  const [existing] = await db.query.opportunities.findMany({
    where: sql`LOWER(${opportunities.companyName}) = LOWER(${body.companyName})`,
    limit: 1,
  });
  if (existing) {
    return NextResponse.json(
      { error: "duplicate", existing: { id: existing.id, companyName: existing.companyName, stage: existing.stage } },
      { status: 409 }
    );
  }

  const opp: NewOpportunity = {
    id: uid(),
    companyName: body.companyName,
    companyType: body.companyType ?? "Other",
    stage: body.stage ?? "Sparks",
    sector: body.sector ?? null,
    sponsor: body.sponsor ?? null,
    scoutSummary: body.scoutSummary ?? null,
    decisionMaker: body.decisionMaker ?? null,
    source: body.source ?? null,
    entrySource: body.entrySource ?? "Manual",
    nextActions: [],
  };

  const [created] = await db.insert(opportunities).values(opp).returning();

  // Log activity
  let userEmail = "signal-scout@system";
  if (caller !== "signal-scout") {
    const user = await currentUser();
    userEmail = user?.emailAddresses?.[0]?.emailAddress ?? "unknown@system";
  }
  await db.insert(activityLog).values({
    id: uid(),
    opportunityId: created.id,
    userEmail,
    action: "created",
  });

  await publishEvent("opportunity:created", created);

  return NextResponse.json(created, { status: 201 });
}
