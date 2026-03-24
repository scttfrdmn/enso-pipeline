import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/unauthorized"])

export default clerkMiddleware(async (auth, req) => {
  // Service-to-service requests using X-Api-Key bypass Clerk entirely;
  // the route handler validates the key itself.
  if (req.headers.get("x-api-key")) {
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
}
