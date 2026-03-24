import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ALLOWED_DOMAINS = ["playgroundlogic.co", "enso.co"];

// Allow service-to-service POST to /api/opportunities (authenticated via Bearer token in the handler)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/opportunities",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { sessionClaims } = await auth.protect();

  const email = (sessionClaims?.email as string) ?? "";
  if (!ALLOWED_DOMAINS.some(d => email.endsWith(`@${d}`))) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
