import { json, checkLogin, makeToken, configured } from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const missing = configured(env);
  if (missing.length) return json({ error: `Strežnik ni nastavljen (manjka: ${missing.join(", ")}).` }, 500);
  let body = {};
  try { body = await request.json(); } catch {}
  const user = await checkLogin(env, body.username, body.password);
  if (!user) {
    await new Promise(r => setTimeout(r, 800)); // upočasni ugibanje gesel
    return json({ error: "Napačno uporabniško ime ali geslo." }, 401);
  }
  return json({ token: await makeToken(env, user), name: user.name, role: user.role });
}
