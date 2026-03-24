import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { opportunities, activityLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/realtime";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

async function requireAuth() {
  const { userId } = await auth();
  if (!userId) return null;
  return userId;
}

async function getUserEmail(): Promise<string> {
  const user = await currentUser();
  return user?.emailAddresses?.[0]?.emailAddress ?? "unknown@system";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const opp = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });

  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(opp);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // Fetch current state for activity log diffing
  const current = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If stage is changing, update stageEnteredAt
  const updates = { ...body, updatedAt: new Date() };
  if (body.stage !== undefined && body.stage !== current.stage) {
    updates.stageEnteredAt = new Date();
  }

  const [updated] = await db
    .update(opportunities)
    .set(updates)
    .where(eq(opportunities.id, id))
    .returning();

  // Write activity log entries for changed fields
  const userEmail = await getUserEmail();
  const trackFields = [
    "companyName", "companyType", "stage", "sector", "sponsor",
    "scoutSummary", "decisionMaker", "source", "entrySource",
    "researchNotes", "linkedinConnections", "swarmNotes", "nextActions",
  ] as const;

  const logEntries = trackFields
    .filter((f) => body[f] !== undefined && JSON.stringify(body[f]) !== JSON.stringify(current[f]))
    .map((field) => ({
      id: uid(),
      opportunityId: id,
      userEmail,
      action: "updated" as const,
      field,
      oldValue: String(current[field] ?? ""),
      newValue: String(body[field] ?? ""),
    }));

  if (logEntries.length > 0) {
    await db.insert(activityLog).values(logEntries);
  }

  await publishEvent("opportunity:updated", updated);

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const userEmail = await getUserEmail();

  await db.delete(opportunities).where(eq(opportunities.id, id));
  await db.insert(activityLog).values({
    id: uid(),
    opportunityId: id,
    userEmail,
    action: "deleted",
  });

  await publishEvent("opportunity:deleted", { id });

  return new NextResponse(null, { status: 204 });
}
