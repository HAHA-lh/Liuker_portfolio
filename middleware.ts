import { NextResponse, type NextRequest } from "next/server";
import { mediaRequestDecision } from "./app/security/media-policy";

export function middleware(request: NextRequest) {
  const decision = mediaRequestDecision(request.nextUrl, request.headers);
  if (decision !== "allow") {
    return new NextResponse("Media access is limited to playback on LIUKER Portfolio.", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/media/:path*"] };
