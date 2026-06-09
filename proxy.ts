import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — required for Supabase SSR auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isCandidateRoute = ["/swipe", "/tracker", "/profile"].some((p) => pathname.startsWith(p));
  const isEmployerRoute = pathname.startsWith("/employer") && !pathname.startsWith("/employer/login") && !pathname.startsWith("/employer/signup");

  if ((isCandidateRoute || isEmployerRoute) && !user) {
    if (pathname.startsWith("/employer")) {
      return NextResponse.redirect(new URL("/employer/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    // Check if user exists in employers table
    const { data: employer } = await supabase
      .from("employers")
      .select("id")
      .eq("id", user.id)
      .single();
    
    if (employer) {
      if (isCandidateRoute || pathname === "/login" || pathname === "/signup" || pathname === "/employer/login" || pathname === "/employer/signup") {
        if (pathname !== "/employer/dashboard") {
          return NextResponse.redirect(new URL("/employer/dashboard", request.url));
        }
      }
    } else {
      // Assume candidate
      if (isEmployerRoute || pathname === "/login" || pathname === "/signup" || pathname === "/employer/login" || pathname === "/employer/signup") {
        if (pathname !== "/swipe") {
          return NextResponse.redirect(new URL("/swipe", request.url));
        }
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
