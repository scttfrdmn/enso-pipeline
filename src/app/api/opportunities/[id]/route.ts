import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { opportunities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/realtime";

async function requireAuth() {
  const { userId } = await auth();
  if (!userId) return null;
  return userId;
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

  const [updated] = await db
    .update(opportunities)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(opportunities.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await publishEvent("opportunity:updated", updated);

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await db.delete(opportunities).where(eq(opportunities.id, id));
  await publishEvent("opportunity:deleted", { id });

  return new NextResponse(null, { status: 204 });
}
