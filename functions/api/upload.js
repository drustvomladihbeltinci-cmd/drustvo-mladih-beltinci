import { json, requireUser, ghWrite } from "../_lib/auth.js";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

// POST /api/upload  { name, type, data(base64) } -> shrani sliko v mapo uploads/ na GitHubu
export async function onRequestPost({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Prijava je potekla. Prijavi se znova." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Neveljavni podatki." }, 400); }
  const ext = TYPES[body.type];
  if (!ext) return json({ error: "Dovoljene so samo slike (JPG, PNG, WEBP, GIF)." }, 400);
  if (!body.data || body.data.length > 4 * 1024 * 1024) return json({ error: "Slika je prevelika (največ ~3 MB)." }, 413);
  const base = String(body.name || "slika").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "slika";
  const d = new Date();
  const path = `uploads/${d.getFullYear()}/${base}-${d.getTime().toString(36)}.${ext}`;
  try {
    await ghWrite(env, path, body.data, `Slika: ${base} (${user.name})`);
    return json({ ok: true, path: "/" + path });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
