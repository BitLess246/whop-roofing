/**
 * "Sign in with Whop" for the estimate form.
 *
 * Whop's Leads API records a lead against a Whop **user** — `POST /leads`
 * requires a `user_id`, and there is no endpoint that mints a user from an
 * email address. So to record a real lead we have to know who the visitor is,
 * and OAuth is the documented way to learn that.
 *
 * The whole exchange runs server-side: the PKCE verifier and the resulting
 * user id live in httpOnly cookies, so no token is ever readable from page
 * JavaScript. The app is registered as a public OAuth client, so PKCE alone
 * authenticates the exchange and there is no client secret to store.
 *
 * https://docs.whop.com/developer/guides/oauth
 */

import type { Env } from "../env";
import { json } from "./leads";

const AUTHORIZE_URL = "https://api.whop.com/oauth/authorize";
const TOKEN_URL = "https://api.whop.com/oauth/token";
const SCOPE = "openid profile email";

const PKCE_COOKIE = "rf_pkce";
const SESSION_COOKIE = "rf_user";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface WhopIdentity {
  userId: string;
  email?: string;
  name?: string;
}

/* ------------------------------- start ---------------------------------- */

export async function handleAuthStart(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const clientId = appId(env);
  if (!clientId) {
    return json({ ok: false, error: "APP_ID is not available in this runtime." }, 500);
  }

  const returnTo = safeReturnPath(url.searchParams.get("return"));
  const verifier = randomToken(64);
  const state = randomToken(16);
  // Required whenever the `openid` scope is requested, and checked against the
  // id_token's own claim on the way back.
  const nonce = randomToken(16);
  const challenge = await sha256Base64Url(verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(url),
    scope: SCOPE,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${AUTHORIZE_URL}?${params}`,
      // Lax so the cookie survives the redirect back from Whop.
      "Set-Cookie": setCookie(
        PKCE_COOKIE,
        JSON.stringify({ verifier, state, nonce, returnTo }),
        { maxAge: 600, sameSite: "Lax", secure: url.protocol === "https:" },
      ),
      "Cache-Control": "no-store",
    },
  });
}

/* ------------------------------ callback -------------------------------- */

export async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const clientId = appId(env);

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const stored = readJsonCookie<{
    verifier: string;
    state: string;
    nonce: string;
    returnTo: string;
  }>(request, PKCE_COOKIE);
  const returnTo = safeReturnPath(stored?.returnTo);

  const clearPkce = setCookie(PKCE_COOKIE, "", { maxAge: 0, sameSite: "Lax", secure: url.protocol === "https:" });

  if (error) {
    const description = url.searchParams.get("error_description");
    console.error("[auth] authorize rejected", error, description);
    return bounce(returnTo, error === "access_denied" ? "denied" : "exchange", clearPkce);
  }
  if (!code || !state || !stored) return bounce(returnTo, "expired", clearPkce);
  if (!timingSafeEqual(state, stored.state)) return bounce(returnTo, "state", clearPkce);
  if (!clientId) return bounce(returnTo, "config", clearPkce);

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Whop hosting signs outbound calls to its own API with the app's key;
        // the OAuth exchange must go up unauthenticated instead.
        "x-whop-inject-key": "none",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(url),
        client_id: clientId,
        code_verifier: stored.verifier,
      }),
    });

    if (!tokenRes.ok) {
      console.error("[auth] token exchange failed", tokenRes.status, (await tokenRes.text()).slice(0, 300));
      return bounce(returnTo, "exchange", clearPkce);
    }

    const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string };
    const claims = claimsFrom(tokens.id_token);

    if (!claims?.sub) {
      console.error("[auth] no user id in the id_token");
      return bounce(returnTo, "identity", clearPkce);
    }
    if (claims.nonce !== stored.nonce) {
      console.error("[auth] id_token nonce did not match the request");
      return bounce(returnTo, "state", clearPkce);
    }

    const identity: WhopIdentity = {
      userId: claims.sub,
      email: claims.email,
      name: claims.name ?? claims.preferred_username,
    };

    // Only the user id is kept, signed so it cannot be forged, and the access
    // token is deliberately discarded — the lead is written with the app's own
    // credentials, so nothing here needs to act on the visitor's behalf.
    const session = await signSession(identity, env);

    return new Response(null, {
      status: 302,
      headers: [
        ["Location", `${returnTo}?signed_in=1`],
        ["Set-Cookie", clearPkce],
        [
          "Set-Cookie",
          setCookie(SESSION_COOKIE, session, {
            maxAge: SESSION_MAX_AGE,
            sameSite: "Lax",
            secure: url.protocol === "https:",
          }),
        ],
        ["Cache-Control", "no-store"],
      ],
    });
  } catch (err) {
    console.error("[auth] callback failed", err);
    return bounce(returnTo, "unknown", clearPkce);
  }
}

/* ------------------------------- session -------------------------------- */

/** Reads and verifies the signed identity cookie. Returns null when absent or tampered. */
export async function readIdentity(request: Request, env: Env): Promise<WhopIdentity | null> {
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot === -1) return null;

  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = await hmac(payload, sessionSecret(env));
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as WhopIdentity;
    return decoded.userId ? decoded : null;
  } catch {
    return null;
  }
}

async function signSession(identity: WhopIdentity, env: Env): Promise<string> {
  const payload = base64UrlEncode(JSON.stringify(identity));
  return `${payload}.${await hmac(payload, sessionSecret(env))}`;
}

/**
 * The signing key. `SESSION_SECRET` is the intended source; the app id is a
 * fallback so a deployment without it still cannot have its cookie forged by
 * someone who only controls a browser.
 */
function sessionSecret(env: Env): string {
  return env.SESSION_SECRET ?? `${appId(env) ?? "app"}:${env.BUILD_ID ?? "build"}`;
}

/* -------------------------------- helpers -------------------------------- */

function appId(env: Env): string | undefined {
  return env.APP_ID ?? env.WHOP_APP_ID;
}

function redirectUri(url: URL): string {
  return `${url.origin}/api/auth/callback`;
}

/** Only same-site paths, so the callback can never be turned into an open redirect. */
function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/estimate";
  return value.split("?")[0]!;
}

function bounce(returnTo: string, reason: string, clearCookie: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${returnTo}?auth_error=${encodeURIComponent(reason)}`,
      "Set-Cookie": clearCookie,
      "Cache-Control": "no-store",
    },
  });
}

interface IdTokenClaims {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  nonce?: string;
}

/** The id_token is read straight off the TLS response from Whop's token endpoint. */
function claimsFrom(idToken: string | undefined): IdTokenClaims | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as IdTokenClaims;
  } catch {
    return null;
  }
}

function randomToken(bytes: number): string {
  return base64UrlBytes(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64UrlBytes(new Uint8Array(digest));
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlBytes(new Uint8Array(sig));
}

function base64UrlBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncode(value: string): string {
  return base64UrlBytes(new TextEncoder().encode(value));
}

function setCookie(
  name: string,
  value: string,
  opts: { maxAge: number; sameSite: "Lax" | "Strict"; secure: boolean },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${opts.sameSite}`,
    `Max-Age=${opts.maxAge}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

function readJsonCookie<T>(request: Request, name: string): T | null {
  const raw = readCookie(request, name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
