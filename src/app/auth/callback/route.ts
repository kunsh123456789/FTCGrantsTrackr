import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google sends people back here after they sign in. We swap the one-time
// code for a session cookie, make sure they have a member row, then continue.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const { data: member, error: memberError } = await supabase.rpc("ensure_member").single<{ role: string }>();
  if (memberError || !member) {
    return NextResponse.redirect(new URL("/login?error=account", origin));
  }

  const destination = member.role === "pending" ? "/pending" : next;
  return NextResponse.redirect(new URL(destination, origin));
}
