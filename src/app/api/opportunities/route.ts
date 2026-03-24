import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { opportunities, type NewOpportunity } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/realtime";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Verify either Clerk session (browser) or service token (Signal Scout)
async function authorize(req: NextRequest): Promise<string | null> {
  // Service-to-service: Bearer token
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === process.env.PIPELINE_API_SECRET) {
      return "signal-scout";
    }
    return null;
  }

  // Browser: Clerk session
  const { userId } = await auth();
  return userId;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stage = req.nextUrl.searchParams.get("stage");
  const all = await db.query.opportunities.findMany({
    where: stage ? eq(opportunities.stage, stage as any) : undefined,
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

  await publishEvent("opportunity:created", created);

  return NextResponse.json(created, { status: 201 });
}
