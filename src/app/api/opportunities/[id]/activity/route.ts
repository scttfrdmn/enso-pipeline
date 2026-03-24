import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const entries = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.opportunityId, id))
    .orderBy(desc(activityLog.createdAt))
    .limit(50);

  return NextResponse.json(entries);
}
