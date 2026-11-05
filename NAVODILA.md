# Spletna stran Društva mladih Beltinci – navodila

## Kako deluje

- Stran je objavljena na **Cloudflare Pages** (brezplačno) in je povezana s tem GitHub repozitorijem.
- Vsebina (novice, dogodki, projekti in besedilo O nas) je shranjena v mapi `content/` kot JSON datoteke. Slike so v mapi `uploads/`.
- Vodje projektov se prijavijo na **/admin**. Ko kliknejo »Shrani in objavi«, se sprememba **zapiše neposredno v ta GitHub repozitorij** (kot commit z njihovim imenom). Cloudflare stran nato samodejno ponovno objavi v 1–2 minutah.
- Obrazec **Postani član** pošlje prijavo na e-naslov, ki je nastavljen v `js/config.js` (zdaj tajnik.dmb@gmail.com).

## Enkratna nastavitev (približno 15 minut)

### 1. GitHub žeton (da lahko stran zapisuje v repozitorij)
1. GitHub → klik na profilno sliko → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Ime: `dmb-spletna-stran`, Expiration: najdlje možno (žeton si zapišite in ga pred iztekom obnovite).
3. **Repository access → Only select repositories** → izberite repozitorij strani.
4. **Permissions → Repository permissions → Contents: Read and write**.
5. Kliknite *Generate token* in žeton kopirajte (prikaže se samo enkrat).

### 2. Cloudflare Pages
1. Ustvarite brezplačen račun na <https://dash.cloudflare.com>.
2. **Workers & Pages → Create → Pages → Connect to Git** → povežite GitHub in izberite repozitorij.
3. Build settings: *Framework preset* **None**, *Build command* **prazno**, *Build output directory* **/** (ali prazno).
4. Kliknite *Save and Deploy*.

### 3. Uporabniki in gesla
1. Na objavljeni strani odprite **/admin/nov-uporabnik.html**.
2. Vpišite uporabnike (uporabniško ime, ime in priimek, geslo, vloga) in kliknite *Ustvari vrednost USERS*. Gesla se šifrirajo v vašem brskalniku.
3. Zeleno polje kopirajte.

Vloge:
- **administrator** – ureja vse, tudi besedilo O nas in kontakte;
- **vodja projekta** – ureja Aktualno, Dogodke in Projekte.

### 4. Spremenljivke v Cloudflare
Cloudflare → vaš projekt → **Settings → Variables and Secrets** → za *Production* dodajte (tip **Secret**):

| Ime | Vrednost |
|---|---|
| `GITHUB_TOKEN` | žeton iz 1. koraka |
| `GITHUB_REPO` | `drustvomladihbeltinci-cmd/IME-REPOZITORIJA` |
| `GITHUB_BRANCH` | `main` (ali ime vaše glavne veje) |
| `SESSION_SECRET` | poljuben dolg naključen niz (vsaj 32 znakov) |
| `USERS` | vrednost iz 3. koraka |

Nato **Deployments → zadnja objava → Retry deployment**, da se spremenljivke upoštevajo.

### 5. Obrazec Postani član
Ob **prvi** oddaji obrazca storitev FormSubmit na tajnik.dmb@gmail.com pošlje e-mail »Activate Form«. Kliknite potrditev. Od takrat naprej prijave prihajajo samodejno. Prvo prijavo lahko oddate kar sami za preizkus. E-naslov spremenite v `js/config.js`.

### 6. Lastna domena (neobvezno)
Cloudflare → projekt → **Custom domains** → dodajte svojo domeno.

## Pogosta opravila
- **Nov vodja projekta / pozabljeno geslo:** ponovno ustvarite vrednost USERS (z vsemi uporabniki) in jo zamenjajte v Cloudflare, nato *Retry deployment*.
- **Odvzem dostopa:** uporabnika odstranite iz USERS. Dostop izgubi takoj po ponovni objavi.
- **Zgodovina sprememb:** na GitHubu so pod *Commits* vidne vse spremembe in kdo jih je naredil. Vsako lahko tudi razveljavite.
