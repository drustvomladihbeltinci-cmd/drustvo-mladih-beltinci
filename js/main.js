(function () {
  "use strict";
  const C = window.DMB_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Meni na telefonu
  const btn = $(".menu-btn"), nav = $("#nav");
  btn.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });
  nav.addEventListener("click", e => { if (e.target.tagName === "A") { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });

  $("#leto").textContent = new Date().getFullYear();

  // Družbena omrežja
  const NETS = [
    ["instagram", "Instagram", "fa-instagram"], ["facebook", "Facebook", "fa-facebook-f"],
    ["tiktok", "TikTok", "fa-tiktok"], ["youtube", "YouTube", "fa-youtube"], ["linkedin", "LinkedIn", "fa-linkedin-in"]
  ].filter(([k]) => /^https:\/\//.test((C.socials || {})[k] || ""));
  document.querySelectorAll("[data-socials]").forEach(el => {
    const big = el.dataset.socials === "buttons";
    el.innerHTML = NETS.map(([k, label, icon]) => {
      const url = esc(C.socials[k]);
      return big
        ? `<a class="net net-${k}" href="${url}" target="_blank" rel="noopener"><i class="fa-brands ${icon}" aria-hidden="true"></i><span>${label}</span></a>`
        : `<a href="${url}" target="_blank" rel="noopener" aria-label="${label}" title="${label}"><i class="fa-brands ${icon}" aria-hidden="true"></i></a>`;
    }).join("");
  });

  // Facebook objave (uradni vtičnik Facebook Page Plugin)
  const fbBox = $("#fb-box");
  function renderFb() {
    if (!fbBox || !C.facebookPage) return;
    const w = Math.max(180, Math.min(500, Math.floor(fbBox.clientWidth)));
    if (fbBox.dataset.w === String(w)) return;
    fbBox.dataset.w = w;
    const src = "https://www.facebook.com/plugins/page.php?href=" + encodeURIComponent(C.facebookPage) +
      `&tabs=timeline&width=${w}&height=720&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false&locale=sl_SI`;
    fbBox.innerHTML = `<iframe title="Facebook objave Društva mladih Beltinci" src="${src}" width="${w}" height="720" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen loading="lazy" allow="clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
  }
  renderFb();
  let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(renderFb, 300); });

  // Pristopna izjava (Google Forms)
  const m = String(C.googleFormUrl || "").trim().match(/^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+/);
  if (m) {
    const frame = $("#gform");
    frame.src = m[0] + "/viewform?embedded=true";
    frame.hidden = false;
    $("#gform-missing").hidden = true;
  }

  // Instagram objave (uradni Instagram embed)
  const igHtml = id => {
    const url = `https://www.instagram.com/p/${id}/`;
    return `<blockquote class="instagram-media" data-instgrm-permalink="${url}?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" data-instgrm-captioned>
      <a href="${url}" target="_blank" rel="noopener" class="ig-fallback"><i class="fa-brands fa-instagram" aria-hidden="true"></i> Poglej objavo na Instagramu</a>
    </blockquote>`;
  };
  let igLoading = null;
  function igProcess() {
    if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
    if (igLoading) return;
    igLoading = document.createElement("script");
    igLoading.src = "https://www.instagram.com/embed.js";
    igLoading.async = true;
    document.body.appendChild(igLoading);
  }
  document.querySelectorAll("[data-ig]").forEach(el => { el.innerHTML = igHtml(el.dataset.ig); });

  // Dan mladih po letih
  const dmPost = $("#dm-post");
  const yearBtns = document.querySelectorAll("[data-ig-year]");
  function showYear(btn) {
    yearBtns.forEach(b => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
    dmPost.innerHTML = igHtml(btn.dataset.igYear);
    igProcess();
  }
  yearBtns.forEach(b => b.addEventListener("click", () => showYear(b)));
  if (yearBtns.length) showYear(yearBtns[0]); else igProcess();

  // Animacija ob pomikanju
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
  } else document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
})();
