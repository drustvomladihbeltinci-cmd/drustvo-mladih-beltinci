# Spletna stran Društva mladih Beltinci – navodila

Stran je statična (HTML, CSS, JS) in deluje na GitHub Pages brez dodatnih nastavitev.

## Kaj urejate kje
| Kaj | Datoteka |
|---|---|
| Besedila (O nas, Projekti, Za partnerje, Postani član) | `index.html` |
| Povezave do omrežij, Facebook stran, povezava do prijavnice | `js/config.js` |
| Barve in videz | `css/style.css` |
| Grb | `assets/grb.svg`, `assets/grb.png` |

Na GitHubu odprite datoteko → svinčnik (Edit) → spremenite → **Commit changes**. Stran se posodobi v 1–2 minutah.

## Objave z omrežij
- **Instagram** prikazuje Juicer (juicer.io, vir `my-feed-38dbe5b2-…`). V Juicerju lahko objave skrijete ali vklopite moderacijo.
- **Facebook** prikazuje uradni Facebookov vtičnik za strani. Stran nastavite v `js/config.js` (`facebookPage`).

## Prijavnica
Pristopna izjava je Google Forms obrazec (povezava v `js/config.js`, `googleFormUrl`). Odgovori se shranjujejo v preglednico na Drivu tajnika. Za e-obvestilo na glavni naslov glejte funkcijo `obvestiloONovemOdgovoru` v `google-forms-pristopna-izjava.gs`.
