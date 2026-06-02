import { NextResponse } from "next/server";

/**
 * POST /api/admin/login
 *
 * Validates admin credentials against the server-only env vars
 * `ADMIN_EMAIL` and `ADMIN_PASSWORD` (defined in `.env.local`). Because
 * these don't carry the `NEXT_PUBLIC_` prefix, they're never bundled into
 * the browser — the password lives only in this server route.
 *
 * On success returns `{ ok: true, profile }`. The profile is what the
 * client uses to instantiate an `Admin` object via `AdminAuthManager`. On
 * failure returns a 401 with `{ ok: false, reason }`.
 *
 * Future work: replace the env-var compare with a real users table lookup
 * + bcrypt verification once MySQL is wired up. The shape of this
 * response is intentionally what the rest of the app already expects.
 */

// Force the Node runtime so `process.env` reads work the same way as the
// rest of the app. (Edge would also work, but Node keeps it simple.)
export const runtime = "nodejs";

type Body = { email?: unknown; password?: unknown };

/** Length-independent constant-time string compare. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Malformed request body." },
      { status: 400 }
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, reason: "Email and password are required." },
      { status: 400 }
    );
  }

  const expectedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || "";

  if (!expectedEmail || !expectedPassword) {
    // Misconfiguration shouldn't silently grant access — fail loudly.
    return NextResponse.json(
      {
        ok: false,
        reason:
          "Admin credentials are not configured on the server. " +
          "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local.",
      },
      { status: 500 }
    );
  }

  const emailOk = safeEqual(email, expectedEmail);
  const passwordOk = safeEqual(password, expectedPassword);

  if (!emailOk || !passwordOk) {
    return NextResponse.json(
      { ok: false, reason: "Invalid administrator credentials." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    profile: {
      email: expectedEmail,
      name: "Platform Administrator",
      department: "NexusVote Operations",
    },
  });
}
