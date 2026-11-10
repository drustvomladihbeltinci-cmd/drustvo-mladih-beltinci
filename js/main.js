(function () {
  "use strict";
  const MESECI = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];
  const $ = (s, r = document) => r.querySelector(s);

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function paragraphs(text) {
    return String(text || "").split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  }
  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("sl-SI", { day: "numeric", month: "long", year: "numeric" });
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^(https?:\/\/|\/|uploads\/)/i.test(u) ? u : "";
  }
  async function load(name) {
    const r = await fetch(`content/${name}.json?v=${Date.now()}`);
    if (!r.ok) throw new Error(name);
    return r.json();
  }
  function img(src, alt) {
    const u = safeUrl(src);
    return u ? `<img src="${esc(u)}" alt="${esc(alt)}" loading="lazy">` : `<img class="ph" src="assets/grb.svg" alt="">`;
  }

  // Modal
  const modal = $("#modal");
  function openModal(html) { $("#modal-body").innerHTML = html; modal.hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ""; }
  modal.addEventListener("click", e => { if (e.target === modal || e.target.closest(".modal-close")) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  // Meni
  const btn = $(".menu-btn"), nav = $("#nav");
  btn.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });
  nav.addEventListener("click", e => { if (e.target.tagName === "A") nav.classList.remove("open"); });

  $("#leto").textContent = new Date().getFullYear();

  // Vsebina
  load("site").then(site => {
    document.querySelectorAll("[data-bind]").forEach(el => {
      const v = el.dataset.bind.split(".").reduce((o, k) => (o || {})[k], site);
      if (el.dataset.bind === "o_nas") el.innerHTML = paragraphs(v); else el.textContent = v || "";
    });
    $("#vrednote").innerHTML = (site.vrednote || []).map(v =>
      `<div class="value"><h3>${esc(v.naslov)}</h3><p>${esc(v.opis)}</p></div>`).join("");
    const k = site.kontakt || {};
    const links = [];
    if (k.email) links.push(`<a href="mailto:${esc(k.email)}">${esc(k.email)}</a>`);
    const NETS = [
      ["instagram", "Instagram", "fa-instagram"], ["facebook", "Facebook", "fa-facebook-f"],
      ["tiktok", "TikTok", "fa-tiktok"], ["youtube", "YouTube", "fa-youtube"], ["linkedin", "LinkedIn", "fa-linkedin-in"]
    ].filter(([key]) => safeUrl(k[key]));
    const icon = (cls, label) => `<i class="fa-brands ${cls}" aria-hidden="true"></i><span>${label}</span>`;
    $("#socials").innerHTML = NETS.map(([key, label, cls]) =>
      `<a class="net net-${key}" href="${esc(k[key])}" target="_blank" rel="noopener">${icon(cls, label)}</a>`).join("");
    $("#foot-links").innerHTML = links.join("");
    $("#foot-socials").innerHTML = NETS.map(([key, label, cls]) =>
      `<a href="${esc(k[key])}" target="_blank" rel="noopener" aria-label="${label}" title="${label}"><i class="fa-brands ${cls}" aria-hidden="true"></i></a>`).join("");
    const heroSoc = $("#hero-socials");
    if (heroSoc) heroSoc.innerHTML = $("#foot-socials").innerHTML;
  }).catch(() => {});

  load("novice").then(list => {
    list.sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
    const el = $("#novice");
    if (!list.length) { el.innerHTML = `<p class="muted">Trenutno ni novic.</p>`; return; }
    el.innerHTML = list.map((n, i) => `
      <article class="card">
        <div class="card-img">${img(n.slika, n.naslov)}</div>
        <div class="card-body">
          <span class="card-meta">${esc(fmtDate(n.datum))}</span>
          <h3>${esc(n.naslov)}</h3>
          <p>${esc(n.povzetek)}</p>
          <button class="card-more" data-i="${i}">Preberi več</button>
        </div>
      </article>`).join("");
    el.addEventListener("click", e => {
      const b = e.target.closest(".card-more"); if (!b) return;
      const n = list[b.dataset.i];
      openModal(`<span class="card-meta">${esc(fmtDate(n.datum))}${n.avtor ? " · " + esc(n.avtor) : ""}</span>
        <h3>${esc(n.naslov)}</h3>${safeUrl(n.slika) ? img(n.slika, n.naslov) : ""}${paragraphs(n.vsebina || n.povzetek)}`);
    });
  }).catch(() => { $("#novice").innerHTML = `<p class="muted">Novic ni bilo mogoče naložiti.</p>`; });

  function eventHtml(d) {
    const dt = new Date((d.datum || "") + "T12:00:00");
    const ok = !isNaN(dt);
    const link = safeUrl(d.povezava);
    return `<article class="event">
      <div class="event-date"><div class="d">${ok ? dt.getDate() : "?"}</div><div class="m">${ok ? MESECI[dt.getMonth()] : ""}</div></div>
      <div>
        <h3>${esc(d.naslov)}</h3>
        <p class="where">${esc([fmtDate(d.datum), d.ura, d.kraj].filter(Boolean).join(" · "))}</p>
        <p>${esc(d.opis)}</p>
        ${link ? `<p><a href="${esc(link)}" target="_blank" rel="noopener">Več informacij →</a></p>` : ""}
      </div>
    </article>`;
  }
  load("dogodki").then(list => {
    const today = new Date().toISOString().slice(0, 10);
    const up = list.filter(d => (d.datum || "") >= today).sort((a, b) => a.datum.localeCompare(b.datum));
    const past = list.filter(d => (d.datum || "") < today).sort((a, b) => b.datum.localeCompare(a.datum));
    $("#dogodki-list").innerHTML = up.length ? up.map(eventHtml).join("") : `<p class="muted">Trenutno ni napovedanih dogodkov. Spremljaj nas!</p>`;
    if (past.length) { $("#pretekli").innerHTML = past.map(eventHtml).join(""); $("#pretekli-wrap").hidden = false; }
  }).catch(() => { $("#dogodki-list").innerHTML = `<p class="muted">Dogodkov ni bilo mogoče naložiti.</p>`; });

  load("projekti").then(list => {
    if (!list.length) return;
    $("#projekti-wrap").hidden = false;
    $("#projekti").innerHTML = list.map(p => `
      <article class="card">
        <div class="card-img">${img(p.slika, p.naslov)}</div>
        <div class="card-body">
          <span class="badge ${p.status === "zaključen" ? "done" : ""}">${esc(p.status || "v teku")}</span>
          <h3>${esc(p.naslov)}</h3>
          ${p.vodja ? `<span class="card-meta">Vodja: ${esc(p.vodja)}</span>` : ""}
          <p>${esc(p.opis)}</p>
        </div>
      </article>`).join("");
  }).catch(() => {});

  // Filter objav (Juicer): Vse / Instagram / Facebook
  const tabs = document.querySelector(".feed-tabs");
  if (tabs) tabs.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    tabs.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    const ul = document.createElement("ul");
    ul.className = "juicer-feed";
    const old = $("#feed-wrap .juicer-feed");
    ["data-feed-id", "data-per", "data-columns", "data-truncate", "data-gutter"].forEach(a => ul.setAttribute(a, old.getAttribute(a)));
    if (b.dataset.filter) ul.setAttribute("data-filter", b.dataset.filter);
    $("#feed-wrap").replaceChildren(ul);
    // ponovno naloži Juicer skripto, da prebere nov filter
    const sc = document.createElement("script");
    sc.src = "https://www.juicer.io/embed/my-feed-38dbe5b2-9395-4b73-8e58-f80fcfd11913/embed-code.js?t=" + Date.now();
    sc.async = true;
    document.body.appendChild(sc);
  });

  // Prijavnica Postani član (vdelan Google Forms obrazec)
  const formUrl = String((window.DMB_CONFIG || {}).googleFormUrl || "").trim();
  const m = formUrl.match(/^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+/);
  if (m) {
    const frame = $("#gform");
    frame.src = m[0] + "/viewform?embedded=true";
    frame.hidden = false;
    $("#gform-missing").hidden = true;
  }
})();
