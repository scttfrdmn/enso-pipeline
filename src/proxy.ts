import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/unauthorized"])

// clerkMiddleware processes auth before calling our handler, so wrap it separately
// so service-to-service requests with X-Api-Key bypass Clerk entirely.
const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export default function proxy(req: NextRequest, event: unknown) {
  // Service-to-service requests: let the route handler validate the key
  if (req.headers.get("x-api-key")) {
    return NextResponse.next();
  }
  return clerkHandler(req, event)
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
}
