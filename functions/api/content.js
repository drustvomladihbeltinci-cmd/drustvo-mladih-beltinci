import { json, requireUser, ghRead, ghWrite, bytesToB64 } from "../_lib/auth.js";

// Kdo lahko ureja kaj
const FILES = {
  novice: ["admin", "vodja"],
  dogodki: ["admin", "vodja"],
  projekti: ["admin", "vodja"],
  site: ["admin"]
};
const LABEL = { novice: "Aktualno", dogodki: "Dogodki", projekti: "Projekti", site: "O nas" };

// GET /api/content?file=novice  -> sveža vsebina neposredno z GitHuba
export async function onRequestGet({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Prijava je potekla. Prijavi se znova." }, 401);
  const file = new URL(request.url).searchParams.get("file");
  if (!FILES[file]) return json({ error: "Neznana datoteka." }, 400);
  try {
    const { text, sha } = await ghRead(env, `content/${file}.json`);
    return json({ data: text ? JSON.parse(text) : (file === "site" ? {} : []), sha });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}

// POST /api/content  { file, data, sha }  -> zapiše na GitHub (commit)
export async function onRequestPost({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Prijava je potekla. Prijavi se znova." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Neveljavni podatki." }, 400); }
  const { file, data, sha, summary } = body;
  if (!FILES[file]) return json({ error: "Neznana datoteka." }, 400);
  if (!FILES[file].includes(user.role)) return json({ error: "Za urejanje tega razdelka nimaš pravic." }, 403);
  if (file === "site" ? (typeof data !== "object" || Array.isArray(data)) : !Array.isArray(data))
    return json({ error: "Neveljavna oblika podatkov." }, 400);

  const text = JSON.stringify(data, null, 2) + "\n";
  if (text.length > 900000) return json({ error: "Vsebina je prevelika." }, 413);
  const msg = `${LABEL[file]}: ${String(summary || "posodobitev").slice(0, 80)} (${user.name})`;
  try {
    const res = await ghWrite(env, `content/${file}.json`, bytesToB64(new TextEncoder().encode(text)), msg, sha);
    return json({ ok: true, sha: res.content.sha });
  } catch (e) {
    return json({ error: e.message }, e.status === 409 ? 409 : 502);
  }
}
