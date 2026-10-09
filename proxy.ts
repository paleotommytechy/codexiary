import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY &&
  process.env.NEXT_PUBLIC_CONVEX_URL,
);

// Keep the original local-only Codexiary operational before its owner sets up Clerk.
export default clerkConfigured
  ? clerkMiddleware()
  : function localModeProxy() { return NextResponse.next(); };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|mcp)(.*)",
  ],
};
