import { NextRequest, NextResponse } from "next/server";

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isUserAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
  const isAdminAuthRoute = pathname === "/adminauth" || pathname.startsWith("/adminauth/");
  const isAuthRoute = isUserAuthRoute || isAdminAuthRoute;
  // Public routes: /cohorts, /certificate, /legal are explicitly NOT protected
  const isPublicRoute =
    pathname.startsWith("/cohorts") ||
    pathname.startsWith("/certificate") ||
    pathname.startsWith("/legal") ||
    pathname === "/";
  const isProtected =
    !isPublicRoute &&
    ((pathname.startsWith("/admin") && !isAdminAuthRoute) ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/cohort-test") ||
      pathname.startsWith("/api/me") ||
      pathname.startsWith("/api/admin") ||
      pathname.startsWith("/api/applications") ||
      pathname.startsWith("/api/screening") ||
      pathname.startsWith("/api/cohort") ||
      pathname.startsWith("/screening"));

  const token = req.cookies.get("session_token")?.value;

  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  if (!token) {
    if (isProtected) {
      if (pathname.startsWith("/api")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/auth", req.url));
    }
    return NextResponse.next();
  }

  try {
    const tokenHash = await sha256(token);

    // Call Supabase API directly or use an API route to validate? 
    // We can use Supabase JS, but we need the service role or anon key. 
    // We will use standard fetch to Supabase REST API for Edge compatibility.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase env vars in middleware");
      if (pathname.startsWith("/api")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/sessions?session_token_hash=eq.${tokenHash}&select=*,new_users(*)`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      if (response.status >= 500) {
        console.error(`Middleware: Supabase returned ${response.status}`);
        return pathname.startsWith("/api")
          ? NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 })
          : NextResponse.redirect(new URL("/auth?status=unavailable", req.url));
      }
      throw new Error(`Supabase API error: ${response.status}`);
    }

    const sessions = await response.json();
    const session = sessions[0];

    if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
      if (isAuthRoute) return NextResponse.next();
      const resp = pathname.startsWith("/api")
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : NextResponse.redirect(new URL("/auth", req.url));
      resp.cookies.delete("session_token");
      return resp;
    }

    const user = session.new_users;

    if (user.disabled_at) {
      if (isAuthRoute) return NextResponse.next();
      return pathname.startsWith("/api") 
        ? NextResponse.json({ error: "Account disabled" }, { status: 403 }) 
        : NextResponse.redirect(new URL("/auth?status=disabled", req.url));
    }

    const isAdmin = user.role === "admin";
    const isApprovedAdmin = isAdmin && user.admin_approval_status === "approved";

    if (isAuthRoute) {
      if (isAdmin) {
        if (user.admin_approval_status === "pending") {
          return pathname !== "/adminauth" ? NextResponse.redirect(new URL("/adminauth?status=pending", req.url)) : NextResponse.next();
        }
        if (user.admin_approval_status === "rejected") {
          return pathname !== "/adminauth" ? NextResponse.redirect(new URL("/adminauth?status=rejected", req.url)) : NextResponse.next();
        }
        return NextResponse.redirect(new URL("/admin", req.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if ((pathname.startsWith("/admin") && !isAdminAuthRoute) || pathname.startsWith("/api/admin")) {
      if (!isAdmin || !isApprovedAdmin) {
        return pathname.startsWith("/api")
          ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
          : NextResponse.redirect(new URL("/adminauth?status=forbidden", req.url));
      }
    }

    if (pathname.startsWith("/dashboard")) {
      if (isApprovedAdmin) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    // Set user headers for backend usage if needed
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-role", user.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err: any) {
    console.error("Middleware Auth Error:", err);
    
    // Distinguish between fetch/network error and other errors
    const isNetworkError = err instanceof TypeError && err.message.includes("fetch");
    if (isNetworkError) {
      return pathname.startsWith("/api")
        ? NextResponse.json({ error: "Service temporarily unavailable due to network issues" }, { status: 503 })
        : NextResponse.redirect(new URL("/auth?status=unavailable", req.url));
    }

    const resp = pathname.startsWith("/api")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/auth", req.url));
    resp.cookies.delete("session_token");
    return resp;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
