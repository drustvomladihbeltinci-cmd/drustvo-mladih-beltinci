(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);

  // Opis polj za vsak razdelek
  const SCHEMA = {
    novice: {
      label: "Aktualno", one: "novico", title: "naslov", sub: i => i.datum,
      sort: (a, b) => (b.datum || "").localeCompare(a.datum || ""),
      fields: [
        { k: "naslov", l: "Naslov", req: true },
        { k: "datum", l: "Datum objave", type: "date", req: true, def: today },
        { k: "povzetek", l: "Kratek povzetek", type: "textarea", rows: 2, req: true, hint: "Prikaže se na kartici (1–2 stavka)." },
        { k: "vsebina", l: "Celotno besedilo", type: "textarea", rows: 8, hint: "Prazna vrstica = nov odstavek." },
        { k: "slika", l: "Slika", type: "image" },
        { k: "avtor", l: "Avtor", def: () => STATE.name }
      ]
    },
    dogodki: {
      label: "Dogodki", one: "dogodek", title: "naslov", sub: i => [i.datum, i.ura, i.kraj].filter(Boolean).join(" · "),
      sort: (a, b) => (b.datum || "").localeCompare(a.datum || ""),
      fields: [
        { k: "naslov", l: "Naslov dogodka", req: true },
        { k: "datum", l: "Datum", type: "date", req: true, def: today },
        { k: "ura", l: "Ura", type: "time" },
        { k: "kraj", l: "Kraj" },
        { k: "opis", l: "Opis", type: "textarea", rows: 4 },
        { k: "slika", l: "Slika", type: "image" },
        { k: "povezava", l: "Povezava (npr. Facebook dogodek)", type: "url" }
      ]
    },
    projekti: {
      label: "Projekti", one: "projekt", title: "naslov", sub: i => [i.status, i.vodja].filter(Boolean).join(" · "),
      fields: [
        { k: "naslov", l: "Ime projekta", req: true },
        { k: "vodja", l: "Vodja projekta", def: () => STATE.name },
        { k: "status", l: "Status", type: "select", options: ["v pripravi", "v teku", "zaključen"], def: () => "v teku" },
        { k: "opis", l: "Opis projekta", type: "textarea", rows: 5 },
        { k: "slika", l: "Slika", type: "image" }
      ]
    },
    site: { label: "O nas", admin: true }
  };

  const STATE = { token: null, name: "", role: "", tab: "novice", data: null, sha: null };
  try { Object.assign(STATE, JSON.parse(sessionStorage.getItem("dmb_admin") || "{}")); } catch {}

  async function api(path, opts = {}) {
    const r = await fetch(path, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(STATE.token ? { Authorization: "Bearer " + STATE.token } : {}) }
    });
    const j = await r.json().catch(() => ({ error: "Strežnik ni odgovoril pravilno." }));
    if (r.status === 401 && STATE.token) { logout("Prijava je potekla. Prijavi se znova."); throw new Error("401"); }
    if (!r.ok) throw new Error(j.error || "Napaka " + r.status);
    return j;
  }

  function notice(text, kind = "info") {
    const n = $("#notice");
    n.hidden = !text; n.className = "notice " + kind; n.textContent = text || "";
    if (text) n.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---------- Prijava ----------
  function showLogin(msg) {
    $("#app-view").hidden = true; $("#login-view").hidden = false;
    $("#login-msg").textContent = msg || "";
  }
  function logout(msg) {
    STATE.token = null;
    try { sessionStorage.removeItem("dmb_admin"); } catch {}
    showLogin(msg);
  }
  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, b = f.querySelector("button");
    b.disabled = true; $("#login-msg").textContent = "";
    try {
      const j = await api("../api/login", { method: "POST", body: JSON.stringify({ username: f.username.value, password: f.password.value }) });
      Object.assign(STATE, { token: j.token, name: j.name, role: j.role });
      try { sessionStorage.setItem("dmb_admin", JSON.stringify({ token: j.token, name: j.name, role: j.role })); } catch {}
      f.reset(); startApp();
    } catch (err) { $("#login-msg").textContent = err.message; }
    finally { b.disabled = false; }
  });
  $("#logout").addEventListener("click", () => logout());

  // ---------- Aplikacija ----------
  function startApp() {
    $("#login-view").hidden = true; $("#app-view").hidden = false;
    $("#who").textContent = `${STATE.name} (${STATE.role === "admin" ? "administrator" : "vodja projekta"})`;
    const tabs = Object.entries(SCHEMA).filter(([, s]) => !s.admin || STATE.role === "admin");
    $("#tabs").innerHTML = tabs.map(([k, s]) => `<button data-tab="${k}">${s.label}</button>`).join("");
    openTab(STATE.tab in SCHEMA ? STATE.tab : "novice");
  }
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) openTab(b.dataset.tab); });

  async function openTab(tab) {
    STATE.tab = tab; notice("");
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    $("#panel").innerHTML = `<p class="muted">Nalagam …</p>`;
    try {
      const j = await api(`../api/content?file=${tab}`);
      STATE.data = j.data; STATE.sha = j.sha;
      tab === "site" ? renderSite() : renderList();
    } catch (err) { if (err.message !== "401") $("#panel").innerHTML = `<p class="form-msg err">${esc(err.message)}</p>`; }
  }

  async function save(summary) {
    const j = await api("../api/content", { method: "POST", body: JSON.stringify({ file: STATE.tab, data: STATE.data, sha: STATE.sha, summary }) });
    STATE.sha = j.sha;
    notice("✓ Shranjeno! Spremembe so zapisane na GitHub – na spletni strani bodo vidne v 1–2 minutah.", "ok");
  }

  // Seznam
  function renderList() {
    const s = SCHEMA[STATE.tab];
    const items = STATE.data.map((it, i) => ({ it, i }));
    if (s.sort) items.sort((a, b) => s.sort(a.it, b.it));
    $("#panel").innerHTML = `
      <div class="panel-head"><h2>${s.label}</h2><button class="btn btn-navy" id="add">+ Dodaj ${s.one}</button></div>
      <div class="items">${items.length ? items.map(({ it, i }) => `
        <div class="item"><div><strong>${esc(it[s.title])}</strong><small>${esc(s.sub(it))}</small></div>
          <div class="acts"><button class="sbtn" data-edit="${i}">Uredi</button><button class="sbtn danger" data-del="${i}">Izbriši</button></div>
        </div>`).join("") : `<p class="muted">Še ni vnosov.</p>`}</div>`;
    $("#add").onclick = () => renderEditor(-1);
    $("#panel").querySelectorAll("[data-edit]").forEach(b => b.onclick = () => renderEditor(+b.dataset.edit));
    $("#panel").querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      const it = STATE.data[+b.dataset.del];
      if (!confirm(`Res želiš izbrisati »${it[s.title]}«?`)) return;
      const backup = STATE.data.slice();
      STATE.data.splice(+b.dataset.del, 1);
      try { await save(`izbrisano »${it[s.title]}«`); renderList(); }
      catch (err) { STATE.data = backup; if (err.message !== "401") notice(err.message, "err"); }
    });
  }

  function fieldHtml(f, v) {
    const val = esc(v ?? "");
    const req = f.req ? " required" : "";
    const hint = f.hint ? ` <span class="hint">– ${esc(f.hint)}</span>` : "";
    let input;
    if (f.type === "textarea") input = `<textarea name="${f.k}" rows="${f.rows || 4}"${req}>${val}</textarea>`;
    else if (f.type === "select") input = `<select name="${f.k}">${f.options.map(o => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    else if (f.type === "image") input = `<div class="img-field">
        <img src="${val ? (/^(https?:|\/)/.test(v) ? val : "../" + val) : "../assets/grb.svg"}" alt="" data-prev="${f.k}">
        <input type="text" name="${f.k}" value="${val}" placeholder="uploads/... ali https://...">
        <label class="sbtn">Naloži sliko<input type="file" accept="image/*" data-up="${f.k}" hidden></label>
        <button type="button" class="sbtn danger" data-clear="${f.k}">Odstrani</button>
      </div>`;
    else input = `<input name="${f.k}" type="${f.type || "text"}" value="${val}"${req}>`;
    return `<div class="row"><label>${esc(f.l)}${f.req ? "*" : ""}${hint}${f.type === "image" ? "</label>" + input : input + "</label>"}</div>`;
  }

  function slug(s) {
    return String(s || "vnos").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) + "-" + Date.now().toString(36);
  }

  // Urejevalnik enega vnosa
  function renderEditor(index) {
    const s = SCHEMA[STATE.tab];
    const isNew = index < 0;
    const it = isNew ? Object.fromEntries(s.fields.map(f => [f.k, f.def ? f.def() : ""])) : STATE.data[index];
    $("#panel").innerHTML = `
      <div class="panel-head"><h2>${isNew ? "Nov " + s.one : "Urejanje"}</h2></div>
      <form class="form editor" id="ed" novalidate>
        ${s.fields.map(f => fieldHtml(f, it[f.k])).join("")}
        <div class="form-actions">
          <button class="btn btn-yellow" type="submit">Shrani in objavi</button>
          <button class="btn btn-outline-dark sbtn" type="button" id="cancel">Prekliči</button>
        </div>
      </form>`;
    const form = $("#ed");
    bindImages(form);
    $("#cancel").onclick = renderList;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      let bad = false;
      form.querySelectorAll("[required]").forEach(i => { const ok = i.value.trim(); i.classList.toggle("invalid", !ok); if (!ok) bad = true; });
      if (bad) return notice("Izpolni obvezna polja (*).", "err");
      const out = { ...it };
      s.fields.forEach(f => { out[f.k] = form.elements[f.k].value.trim(); });
      if (isNew) out.id = slug(out[s.title]);
      const backup = STATE.data.slice();
      if (isNew) STATE.data.push(out); else STATE.data[index] = out;
      const b = form.querySelector("[type=submit]"); b.disabled = true; b.textContent = "Shranjujem …";
      try { await save(`${isNew ? "dodano" : "urejeno"} »${out[s.title]}«`); renderList(); }
      catch (err) { STATE.data = backup; if (err.message !== "401") notice(err.message, "err"); b.disabled = false; b.textContent = "Shrani in objavi"; }
    });
  }

  function bindImages(root) {
    root.querySelectorAll("[data-up]").forEach(inp => inp.addEventListener("change", async () => {
      const file = inp.files[0]; if (!file) return;
      const k = inp.dataset.up;
      notice("Nalagam sliko …", "info");
      try {
        const blob = await shrink(file);
        const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
        const j = await api("../api/upload", { method: "POST", body: JSON.stringify({ name: file.name, type: blob.type, data }) });
        root.elements[k].value = j.path;
        root.querySelector(`[data-prev="${k}"]`).src = URL.createObjectURL(blob);
        notice("Slika naložena. Ne pozabi klikniti »Shrani in objavi«.", "ok");
      } catch (err) { if (err.message !== "401") notice(err.message, "err"); }
      inp.value = "";
    }));
    root.querySelectorAll("[data-clear]").forEach(b => b.onclick = () => {
      root.elements[b.dataset.clear].value = "";
      root.querySelector(`[data-prev="${b.dataset.clear}"]`).src = "../assets/grb.svg";
    });
  }

  // Pomanjšaj velike fotografije pred nalaganjem (max 1600 px, JPEG)
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return file;
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900000) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(b => res(b || file), "image/jpeg", 0.85));
  }

  // O nas (samo administrator)
  function renderSite() {
    const d = STATE.data;
    d.kontakt = d.kontakt || {}; d.vrednote = d.vrednote || [];
    $("#panel").innerHTML = `
      <div class="panel-head"><h2>O nas</h2></div>
      <form class="form editor" id="site">
        <div class="row"><label>Podnaslov (rumeno, pod napisom DRUŠTVO MLADIH BELTINCI)<input name="podnaslov" value="${esc(d.podnaslov)}"></label></div>
        <div class="row"><label>Slogan (pod podnaslovom)<input name="slogan" value="${esc(d.slogan)}"></label></div>
        <div class="row"><label>Besedilo »O nas« <span class="hint">– prazna vrstica = nov odstavek</span><textarea name="o_nas" rows="8">${esc(d.o_nas)}</textarea></label></div>
        <h3 class="sub" style="font-size:1.4rem;margin:1.5rem 0 .6rem">Vrednote / poudarki</h3>
        <div id="vr">${d.vrednote.map((v, i) => `<div class="vrednota">
          <label>Naslov<input name="vn${i}" value="${esc(v.naslov)}"></label>
          <label>Opis<input name="vo${i}" value="${esc(v.opis)}"></label></div>`).join("")}</div>
        <h3 class="sub" style="font-size:1.4rem;margin:1.5rem 0 .6rem">Kontakt</h3>
        <div class="row two">
          <label>E-pošta<input name="k_email" value="${esc(d.kontakt.email)}"></label>
          <label>Naslov<input name="k_naslov" value="${esc(d.kontakt.naslov)}"></label>
        </div>
        <div class="row two">
          <label>Instagram (povezava)<input name="k_instagram" type="url" value="${esc(d.kontakt.instagram)}"></label>
          <label>Facebook (povezava)<input name="k_facebook" type="url" value="${esc(d.kontakt.facebook)}"></label>
        </div>
        <div class="row two">
          <label>TikTok (povezava)<input name="k_tiktok" type="url" value="${esc(d.kontakt.tiktok)}"></label>
          <label>YouTube (povezava)<input name="k_youtube" type="url" value="${esc(d.kontakt.youtube)}"></label>
        </div>
        <div class="form-actions"><button class="btn btn-yellow" type="submit">Shrani in objavi</button></div>
      </form>`;
    $("#site").addEventListener("submit", async e => {
      e.preventDefault();
      const f = e.target, el = n => f.elements[n].value.trim();
      const backup = JSON.parse(JSON.stringify(d));
      d.podnaslov = el("podnaslov"); d.slogan = el("slogan"); d.o_nas = f.elements.o_nas.value.trim();
      d.vrednote = d.vrednote.map((_, i) => ({ naslov: el("vn" + i), opis: el("vo" + i) }));
      d.kontakt = { email: el("k_email"), naslov: el("k_naslov"), instagram: el("k_instagram"), facebook: el("k_facebook"), tiktok: el("k_tiktok"), youtube: el("k_youtube") };
      try { await save("posodobljeno besedilo"); }
      catch (err) { STATE.data = backup; if (err.message !== "401") notice(err.message, "err"); }
    });
  }

  STATE.token ? startApp() : showLogin();
})();
