import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Ably from "ably";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = new Ably.Rest(process.env.ABLY_API_KEY!);
  const tokenRequest = await client.auth.createTokenRequest({
    clientId: userId,
    capability: { pipeline: ["subscribe"] }, // clients only subscribe; server publishes
  });

  return NextResponse.json(tokenRequest);
}
