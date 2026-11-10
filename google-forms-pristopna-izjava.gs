/**
 * DRUŠTVO MLADIH BELTINCI – samodejna izdelava pristopne izjave v Google Forms
 *
 * NAVODILA (enkrat):
 * 1. Prijavi se v Google račun tajnik.dmb@gmail.com.
 * 2. Odpri https://script.google.com → "Nov projekt".
 * 3. Izbriši vse, kar je v urejevalniku, in prilepi celotno to skripto.
 * 4. Zgoraj izberi funkcijo "ustvariPristopnoIzjavo" in klikni "Zaženi".
 * 5. Google vpraša za dovoljenja → izberi račun tajnika → "Napredno" →
 *    "Pojdi na projekt (ni varno)" → "Dovoli". (To je tvoja lastna skripta.)
 * 6. Spodaj v "Dnevnik izvajanja" se izpišeta povezavi:
 *    - POVEZAVA ZA SPLETNO STRAN (to pošlji / prilepi v js/config.js)
 *    - povezava za urejanje obrazca
 *
 * Skripta naredi:
 *  - obrazec "Pristopna izjava – Društvo mladih Beltinci",
 *  - preglednico z odgovori na Google Drivu tajnika,
 *  - samodejno e-obvestilo na glavni naslov društva ob vsaki novi prijavi.
 * Skripte NE zaženi dvakrat (nastala bi dva obrazca).
 */

const OBVESTILO_NA = "drustvo.mladih.beltinci@gmail.com";

function ustvariPristopnoIzjavo() {
  const form = FormApp.create("Pristopna izjava – Društvo mladih Beltinci");
  form
    .setDescription(
      "Pridruži se Društvu mladih Beltinci! Izpolni pristopno izjavo in tajnik društva te bo kontaktiral v nekaj dneh.\n\n" +
      "Polja z * so obvezna."
    )
    .setConfirmationMessage(
      "Hvala za prijavo! Tvojo pristopno izjavo smo prejeli. Tajnik društva te bo kontaktiral v nekaj dneh. " +
      "Do takrat nas spremljaj na Instagramu in Facebooku."
    )
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false)
    .setProgressBar(true)
    .setAcceptingResponses(true);

  const emailVal = FormApp.createTextValidation()
    .setHelpText("Vpiši veljaven e-poštni naslov.")
    .requireTextIsEmail()
    .build();

  // ---------- 1. stran: osebni podatki ----------
  form.addSectionHeaderItem().setTitle("Osebni podatki");
  form.addTextItem().setTitle("Ime in priimek").setRequired(true);
  form.addDateItem().setTitle("Datum rojstva").setRequired(true);
  form.addTextItem().setTitle("Naslov (ulica in hišna številka)").setRequired(true);
  form.addTextItem().setTitle("Poštna številka in kraj").setHelpText("npr. 9231 Beltinci").setRequired(true);
  form.addTextItem().setTitle("E-pošta").setValidation(emailVal).setRequired(true);
  form.addTextItem().setTitle("Telefon").setHelpText("Neobvezno – za lažji dogovor.");
  form.addMultipleChoiceItem()
    .setTitle("Status")
    .setChoiceValues(["Učenec/učenka", "Dijak/dijakinja", "Študent/študentka", "Zaposlen/a", "Iščem zaposlitev"])
    .showOtherOption(true)
    .setRequired(true);
  const mladoletnost = form.addMultipleChoiceItem()
    .setTitle("Ali si mlajši/mlajša od 15 let?")
    .setHelpText("Za člane, mlajše od 15 let, potrebujemo soglasje staršev oz. zakonitega zastopnika.")
    .setRequired(true);

  // ---------- 2. stran: soglasje zakonitega zastopnika (samo za mlajše od 15) ----------
  const strSoglasje = form.addPageBreakItem()
    .setTitle("Soglasje starša oz. zakonitega zastopnika")
    .setHelpText("Izpolni starš ali zakoniti zastopnik.");
  form.addTextItem().setTitle("Ime in priimek starša / zakonitega zastopnika").setRequired(true);
  form.addTextItem().setTitle("E-pošta ali telefon starša / zakonitega zastopnika").setRequired(true);
  form.addCheckboxItem()
    .setTitle("Soglasje")
    .setChoiceValues(["Kot starš oz. zakoniti zastopnik soglašam, da se otrok včlani v Društvo mladih Beltinci."])
    .setRequired(true);

  // ---------- 3. stran: interesi ----------
  const strInteresi = form.addPageBreakItem()
    .setTitle("Tvoji interesi")
    .setHelpText("Pomagaj nam spoznati, kaj te zanima.");
  form.addCheckboxItem()
    .setTitle("Kaj te najbolj zanima?")
    .setChoiceValues([
      "Izobraževanje (pub kvizi, literarni večeri, delavnice)",
      "Šport in gibanje (pilates, joga, vozičkanje)",
      "Druženje in povezovanje",
      "Organizacija Dneva mladih Beltinci"
    ])
    .showOtherOption(true);
  form.addCheckboxItem()
    .setTitle("Pri čem bi lahko pomagal/a?")
    .setChoiceValues([
      "Organizacija dogodkov",
      "Promocija in družbena omrežja",
      "Fotografija in video",
      "Oblikovanje (plakati, grafike)",
      "Pomoč na dogodkih (postavitev, stojnice)",
      "Iskanje sponzorjev in partnerjev"
    ])
    .showOtherOption(true);
  form.addParagraphTextItem().setTitle("Imaš idejo za projekt ali dogodek? Napiši jo!");
  form.addMultipleChoiceItem()
    .setTitle("Kje si izvedel/a za nas?")
    .setChoiceValues(["Instagram", "Facebook", "Prijatelji", "Dan mladih", "Spletna stran"])
    .showOtherOption(true);

  // ---------- izjave ----------
  form.addSectionHeaderItem().setTitle("Izjava");
  form.addCheckboxItem()
    .setTitle("Pristopna izjava")
    .setChoiceValues([
      "Želim postati član/članica Društva mladih Beltinci. Seznanjen/a sem s pravili društva in jih bom spoštoval/a."
    ])
    .setRequired(true);
  form.addCheckboxItem()
    .setTitle("Varstvo osebnih podatkov")
    .setHelpText("Podatke uporabljamo izključno za vodenje evidence članstva in obveščanje o delovanju društva. Ne posredujemo jih tretjim osebam.")
    .setChoiceValues(["Soglašam z zbiranjem in obdelavo mojih osebnih podatkov za namene članstva v društvu."])
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle("Fotografije z dogodkov")
    .setChoiceValues([
      "Soglašam z objavo fotografij in video posnetkov, na katerih sem, na spletni strani in omrežjih društva.",
      "Ne soglašam."
    ])
    .setRequired(true);

  // Usmerjanje: mlajši od 15 → soglasje, ostali → interesi; po soglasju naprej na interese
  mladoletnost.setChoices([
    mladoletnost.createChoice("Da", strSoglasje),
    mladoletnost.createChoice("Ne", strInteresi)
  ]);

  // Objava obrazca (novejši obrazci so sicer lahko neobjavljeni)
  try { form.setPublished(true); } catch (err) { /* starejša različica – obrazec je že objavljen */ }

  // Preglednica z odgovori na Drivu tajnika
  const ss = SpreadsheetApp.create("DMB – pristopne izjave (odgovori)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // E-obvestilo ob vsaki novi prijavi
  ScriptApp.newTrigger("obvestiloONovemOdgovoru").forForm(form).onFormSubmit().create();

  Logger.log("✅ Obrazec je ustvarjen.");
  Logger.log("POVEZAVA ZA SPLETNO STRAN: " + form.getPublishedUrl());
  Logger.log("Urejanje obrazca: " + form.getEditUrl());
  Logger.log("Preglednica z odgovori: " + ss.getUrl());
}

function obvestiloONovemOdgovoru(e) {
  const odgovori = e.response.getItemResponses();
  const vrstice = odgovori.map(function (o) {
    const v = o.getResponse();
    return "• " + o.getItem().getTitle() + ": " + (Array.isArray(v) ? v.join(", ") : v);
  });
  const najdi = function (naslov) {
    for (var i = 0; i < odgovori.length; i++) {
      if (odgovori[i].getItem().getTitle() === naslov) return String(odgovori[i].getResponse());
    }
    return "";
  };
  const ime = najdi("Ime in priimek");
  const email = najdi("E-pošta");
  const besedilo =
    "Nova pristopna izjava za Društvo mladih Beltinci\n\n" +
    vrstice.join("\n") +
    "\n\nOddano: " + Utilities.formatDate(e.response.getTimestamp(), "Europe/Ljubljana", "d. M. yyyy 'ob' HH:mm") +
    "\nVse prijave so v preglednici »DMB – pristopne izjave (odgovori)« na Google Drivu tajnika.";
  const moznosti = { name: "DMB prijavnica" };
  if (email) moznosti.replyTo = email;
  MailApp.sendEmail(OBVESTILO_NA, "Nova prijava za članstvo: " + ime, besedilo, moznosti);
}
