import Ably from "ably";

let client: Ably.Rest | null = null;

function getClient() {
  if (!client) {
    client = new Ably.Rest(process.env.ABLY_API_KEY!);
  }
  return client;
}

export const PIPELINE_CHANNEL = "pipeline";

export async function publishEvent(event: string, data: unknown) {
  try {
    const channel = getClient().channels.get(PIPELINE_CHANNEL);
    await channel.publish(event, data);
  } catch (err) {
    // Real-time publish failure should never block the main operation
    console.error("[realtime] publish failed:", err);
  }
}
