import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// /api/opportunities accepts Bearer token from Signal Scout (auth handled in the route handler)
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/unauthorized", "/api/opportunities(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
}
