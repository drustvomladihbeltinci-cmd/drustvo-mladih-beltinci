// Skupne funkcije za prijavo in zapisovanje na GitHub (Cloudflare Pages Functions)
const enc = new TextEncoder();

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function b64url(bytes) {
  let s = "";
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function hashPassword(password, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return hex(bits);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function getUsers(env) {
  try { return JSON.parse(env.USERS || "{}"); } catch { return {}; }
}

export async function checkLogin(env, username, password) {
  const users = getUsers(env);
  const u = users[String(username || "").toLowerCase().trim()];
  if (!u || !u.salt || !u.hash) return null;
  const h = await hashPassword(String(password || ""), u.salt);
  return safeEqual(h, u.hash) ? { username: String(username).toLowerCase().trim(), name: u.name || username, role: u.role || "vodja" } : null;
}

export async function makeToken(env, user) {
  const payload = { u: user.username, n: user.name, r: user.role, exp: Date.now() + 12 * 3600 * 1000 };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env.SESSION_SECRET), enc.encode(body));
  return body + "." + b64url(new Uint8Array(sig));
}

export async function requireUser(request, env) {
  if (!env.SESSION_SECRET) return null;
  const h = request.headers.get("Authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  let p;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(env.SESSION_SECRET), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    p = JSON.parse(new TextDecoder().decode(fromB64url(body)));
  } catch { return null; }
  if (!p || p.exp < Date.now()) return null;
  // Uporabnik mora še vedno obstajati (če ga odstranite, izgubi dostop takoj)
  const users = getUsers(env);
  if (!users[p.u]) return null;
  return { username: p.u, name: users[p.u].name || p.n, role: users[p.u].role || "vodja" };
}

// ---------- GitHub ----------
function gh(env, path, init = {}) {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "dmb-spletna-stran",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {})
    }
  });
}
const branch = env => env.GITHUB_BRANCH || "main";

export function bytesToB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function ghRead(env, path) {
  const r = await gh(env, `${path}?ref=${encodeURIComponent(branch(env))}`);
  if (r.status === 404) return { sha: null, text: null };
  if (!r.ok) throw new Error(`GitHub branje (${r.status})`);
  const j = await r.json();
  const bin = atob(j.content.replace(/\n/g, ""));
  return { sha: j.sha, text: new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))) };
}

export async function ghWrite(env, path, b64content, message, sha) {
  const body = { message, content: b64content, branch: branch(env) };
  if (sha) body.sha = sha;
  const r = await gh(env, path, { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  if (!r.ok) {
    const t = await r.text();
    const e = new Error(r.status === 409 ? "Vsebino je medtem spremenil nekdo drug. Osveži stran in poskusi znova." : `GitHub zapis (${r.status}): ${t.slice(0, 200)}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

export function configured(env) {
  const missing = ["GITHUB_TOKEN", "GITHUB_REPO", "SESSION_SECRET", "USERS"].filter(k => !env[k]);
  return missing;
}
