import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { databases, ID, Query, DB_ID, COLLECTION_ID } from "./lib/appwrite";
import { INITIAL_TEILNEHMER, KLASSEN, KLASSEN_INFO } from "./data/initialData";

// ─── Appwrite helpers ───────────────────────────────────────────────────────

async function loadFromAppwrite() {
  const all = [];
  let offset = 0;
  while (true) {
    const res = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.limit(100),
      Query.offset(offset),
    ]);
    all.push(...res.documents);
    if (all.length >= res.total) break;
    offset += 100;
  }
  return all.map(doc => ({
    id: doc.$id,
    klasse: doc.klasse,
    zahlung: doc.zahlung,
    name: doc.name,
    mail: doc.mail,
    nummer: doc.nummer,
    adresse: doc.adresse,
    kennzeichen: doc.kennzeichen,
    modell_nr: doc.modell_nr,
    hersteller: doc.hersteller,
    baujahr: doc.baujahr,
    ps: doc.ps,
    weite: doc.weite,
    weite2: doc.weite2,
    anmerkungen: doc.anmerkungen,
    startnummer: doc.startnummer,
  }));
}

async function saveToAppwrite(t) {
  const data = {
    klasse: t.klasse, zahlung: t.zahlung, name: t.name,
    mail: t.mail, nummer: t.nummer, adresse: t.adresse,
    kennzeichen: t.kennzeichen, modell_nr: t.modell_nr,
    hersteller: t.hersteller, baujahr: t.baujahr, ps: t.ps,
    weite: t.weite, weite2: t.weite2, anmerkungen: t.anmerkungen,
    startnummer: t.startnummer,
  };
  return databases.createDocument(DB_ID, COLLECTION_ID, t.id, data);
}

async function updateInAppwrite(t) {
  const data = {
    klasse: t.klasse, zahlung: t.zahlung, name: t.name,
    mail: t.mail, nummer: t.nummer, adresse: t.adresse,
    kennzeichen: t.kennzeichen, modell_nr: t.modell_nr,
    hersteller: t.hersteller, baujahr: t.baujahr, ps: t.ps,
    weite: t.weite, weite2: t.weite2, anmerkungen: t.anmerkungen,
    startnummer: t.startnummer,
  };
  return databases.updateDocument(DB_ID, COLLECTION_ID, t.id, data);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LS_KEY = "ttt_teilnehmer";

function saveLocal(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}
function loadLocal() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? JSON.parse(raw) : null;
}

function fmWeite(v) {
  if (v === null || v === undefined || v === "") return "—";
  return `${parseFloat(v).toFixed(2)} m`;
}

const MEDAL = ["🥇", "🥈", "🥉"];

// ─── Components ──────────────────────────────────────────────────────────────

function KlasseChip({ k, active, onClick }) {
  const info = KLASSEN_INFO[k];
  const isSchlepper = info?.gruppe === "Schlepper";
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-bold border transition-all ${
        active
          ? "bg-[#b1e6a8] text-black border-[#b1e6a8]"
          : isSchlepper
          ? "bg-[#1a2a1a] text-[#b1e6a8] border-[#2a4a2a] hover:border-[#b1e6a8]"
          : "bg-[#1a1a1a] text-gray-300 border-[#333] hover:border-[#b1e6a8]"
      }`}
    >
      {k}
    </button>
  );
}

function WeiteInput({ value, onChange, placeholder }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={local}
      placeholder={placeholder || "0.00"}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const v = local === "" ? null : parseFloat(local);
        onChange(isNaN(v) ? null : v);
      }}
      className="w-24 bg-[#111] border border-[#333] rounded px-2 py-1 text-white text-right focus:border-[#b1e6a8] focus:outline-none"
    />
  );
}

// ─── Modal: Neuer Teilnehmer ─────────────────────────────────────────────────

const EMPTY_FORM = {
  klasse: "F9", zahlung: false, name: "", mail: "", nummer: "",
  adresse: "", kennzeichen: "", modell_nr: "", hersteller: "",
  baujahr: "", ps: "", anmerkungen: "", startnummer: "",
  weite: null, weite2: null,
};

function NeuerTeilnehmerModal({ defaultKlasse, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, klasse: defaultKlasse });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({ ...form, id: crypto.randomUUID() });
    setSaving(false);
    onClose();
  };

  const field = (label, key, opts = {}) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        type={opts.type || "text"}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={opts.placeholder || ""}
        required={opts.required}
        className="bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white focus:border-[#b1e6a8] focus:outline-none text-sm"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0d0d0d] border border-[#333] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <h2 className="text-[#b1e6a8] font-black text-xl">+ Neuer Teilnehmer</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Klasse */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Klasse</label>
            <div className="flex flex-wrap gap-2">
              {KLASSEN.map(k => (
                <button
                  key={k} type="button"
                  onClick={() => set("klasse", k)}
                  className={`px-3 py-1 rounded-full text-sm font-bold border transition-all ${
                    form.klasse === k
                      ? "bg-[#b1e6a8] text-black border-[#b1e6a8]"
                      : "bg-[#1a1a1a] text-gray-300 border-[#333] hover:border-[#b1e6a8]"
                  }`}
                >{k}</button>
              ))}
            </div>
          </div>

          {field("Name *", "name", { required: true, placeholder: "Vor- und Nachname" })}
          {field("Startnummer", "startnummer", { placeholder: "z.B. 42" })}
          {field("E-Mail", "mail", { type: "email", placeholder: "name@example.de" })}
          {field("Telefon", "nummer", { placeholder: "0171 ..." })}
          {field("Adresse", "adresse", { placeholder: "Straße, PLZ Ort" })}
          {field("Kennzeichen", "kennzeichen", { placeholder: "VER-XX 123" })}
          {field("Hersteller", "hersteller", { placeholder: "Fendt, IHC, Deutz ..." })}
          {field("Modell / Nr.", "modell_nr", { placeholder: "936, Farmer 311 ..." })}
          {field("Baujahr", "baujahr", { placeholder: "1985" })}
          {field("PS", "ps", { placeholder: "120" })}

          {/* Zahlung */}
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={() => set("zahlung", !form.zahlung)}
              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                form.zahlung ? "bg-[#b1e6a8] border-[#b1e6a8] text-black" : "border-[#444]"
              }`}
            >
              {form.zahlung && <span className="text-xs font-bold">✓</span>}
            </button>
            <span className="text-gray-300 text-sm">Startgebühr bezahlt</span>
          </div>

          {/* Anmerkungen */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Anmerkungen</label>
            <textarea
              value={form.anmerkungen}
              onChange={e => set("anmerkungen", e.target.value)}
              rows={2}
              className="bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white focus:border-[#b1e6a8] focus:outline-none text-sm resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2 rounded-lg border border-[#333] text-gray-300 hover:border-[#555] transition-colors">
              Abbrechen
            </button>
            <button type="submit" disabled={saving || !form.name.trim()}
              className="px-6 py-2 rounded-lg bg-[#b1e6a8] text-black font-bold disabled:opacity-40 hover:bg-[#c5f0bc] transition-colors">
              {saving ? "Speichert..." : "Teilnehmer anlegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── View: Teilnehmer ────────────────────────────────────────────────────────

function TeilnehmerView({ teilnehmer, onUpdate, onAdd, appwriteOk }) {
  const [selectedKlasse, setSelectedKlasse] = useState("F9");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const klasse_list = teilnehmer.filter(
    t => t.klasse === selectedKlasse &&
    (search === "" || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  const bezahlt = teilnehmer.filter(t => t.klasse === selectedKlasse && t.zahlung).length;
  const gesamt = teilnehmer.filter(t => t.klasse === selectedKlasse).length;
  const mitWeite = teilnehmer.filter(t => t.klasse === selectedKlasse && t.weite !== null).length;

  return (
    <div>
      {/* Klassen-Filter */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Fahrzeugklassen</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {KLASSEN.filter(k => KLASSEN_INFO[k]?.gruppe === "Fahrzeug").map(k => (
            <KlasseChip key={k} k={k} active={selectedKlasse === k} onClick={() => setSelectedKlasse(k)} />
          ))}
        </div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Schlepperklassen</div>
        <div className="flex flex-wrap gap-2">
          {KLASSEN.filter(k => KLASSEN_INFO[k]?.gruppe === "Schlepper").map(k => (
            <KlasseChip key={k} k={k} active={selectedKlasse === k} onClick={() => setSelectedKlasse(k)} />
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-6 mb-4 text-sm items-center">
        <span className="text-gray-400">Klasse <span className="text-[#b1e6a8] font-bold">{selectedKlasse}</span></span>
        <span className="text-gray-400">Teilnehmer: <span className="text-white font-bold">{gesamt}</span></span>
        <span className="text-gray-400">Bezahlt: <span className="text-[#b1e6a8] font-bold">{bezahlt}/{gesamt}</span></span>
        <span className="text-gray-400">Ergebnisse: <span className="text-white font-bold">{mitWeite}/{gesamt}</span></span>
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto px-4 py-1.5 bg-[#b1e6a8] text-black font-bold rounded-lg text-sm hover:bg-[#c5f0bc] transition-colors"
        >
          + Neuer Teilnehmer
        </button>
      </div>

      {showModal && (
        <NeuerTeilnehmerModal
          defaultKlasse={selectedKlasse}
          onSave={onAdd}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Name suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#111] border border-[#333] rounded px-3 py-2 text-white w-64 focus:border-[#b1e6a8] focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#222]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#111] border-b border-[#222]">
              <th className="px-3 py-3 text-left text-[#b1e6a8] font-semibold w-8">✓</th>
              <th className="px-3 py-3 text-left text-[#b1e6a8] font-semibold">Name</th>
              <th className="px-3 py-3 text-left text-[#b1e6a8] font-semibold hidden md:table-cell">Fahrzeug</th>
              <th className="px-3 py-3 text-left text-[#b1e6a8] font-semibold hidden lg:table-cell">Kennzeichen</th>
              <th className="px-3 py-3 text-right text-[#b1e6a8] font-semibold hidden md:table-cell">PS</th>
              <th className="px-3 py-3 text-right text-[#b1e6a8] font-semibold">Weite</th>
              <th className="px-3 py-3 text-right text-[#b1e6a8] font-semibold">2. Weite</th>
              <th className="px-3 py-3 text-left text-[#b1e6a8] font-semibold hidden xl:table-cell">Anmerkungen</th>
            </tr>
          </thead>
          <tbody>
            {klasse_list.map((t, i) => (
              <tr
                key={t.id}
                className={`border-b border-[#1a1a1a] transition-colors ${
                  i % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0d0d0d]"
                } hover:bg-[#141a14]`}
              >
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onUpdate({ ...t, zahlung: !t.zahlung })}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      t.zahlung
                        ? "bg-[#b1e6a8] border-[#b1e6a8] text-black"
                        : "border-[#444] bg-transparent"
                    }`}
                    title={t.zahlung ? "Bezahlt" : "Nicht bezahlt"}
                  >
                    {t.zahlung && <span className="text-xs font-bold">✓</span>}
                  </button>
                </td>
                <td className="px-3 py-2 text-white font-medium">{t.name}</td>
                <td className="px-3 py-2 text-gray-300 hidden md:table-cell">
                  {[t.hersteller, t.modell_nr].filter(Boolean).join(" ")}
                  {t.baujahr && <span className="text-gray-500 ml-1">({t.baujahr})</span>}
                </td>
                <td className="px-3 py-2 text-gray-400 hidden lg:table-cell">{t.kennzeichen}</td>
                <td className="px-3 py-2 text-right text-gray-300 hidden md:table-cell">{t.ps ? `${t.ps} PS` : "—"}</td>
                <td className="px-3 py-2 text-right">
                  <WeiteInput
                    value={t.weite}
                    onChange={v => onUpdate({ ...t, weite: v })}
                    placeholder="m"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <WeiteInput
                    value={t.weite2}
                    onChange={v => onUpdate({ ...t, weite2: v })}
                    placeholder="m"
                  />
                </td>
                <td className="px-3 py-2 hidden xl:table-cell">
                  <input
                    type="text"
                    value={t.anmerkungen}
                    onChange={e => onUpdate({ ...t, anmerkungen: e.target.value })}
                    placeholder="..."
                    className="bg-transparent border-b border-[#333] px-1 text-gray-400 w-full focus:border-[#b1e6a8] focus:outline-none"
                  />
                </td>
              </tr>
            ))}
            {klasse_list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Keine Teilnehmer gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!appwriteOk && (
        <div className="mt-4 text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-900 rounded px-3 py-2">
          ⚠ Appwrite nicht verbunden — Daten werden lokal gespeichert
        </div>
      )}
    </div>
  );
}

// ─── View: Rangliste ─────────────────────────────────────────────────────────

function RanglisteView({ teilnehmer }) {
  const [selectedKlasse, setSelectedKlasse] = useState("ALL");
  const [showAll, setShowAll] = useState(false);

  const renderKlasse = (k) => {
    const members = teilnehmer
      .filter(t => t.klasse === k)
      .map(t => ({ ...t, bestWeite: Math.max(t.weite ?? 0, t.weite2 ?? 0) || null }))
      .sort((a, b) => {
        if (b.bestWeite && !a.bestWeite) return 1;
        if (a.bestWeite && !b.bestWeite) return -1;
        return (b.bestWeite ?? 0) - (a.bestWeite ?? 0);
      });

    if (members.length === 0) return null;
    const hasResults = members.some(m => m.bestWeite);

    return (
      <div key={k} className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[#b1e6a8] font-bold text-lg">{k}</span>
          <span className="text-gray-500 text-sm">{KLASSEN_INFO[k]?.gruppe}</span>
          <span className="text-gray-600 text-xs">{members.length} Teilnehmer</span>
          {hasResults && (
            <span className="ml-auto text-[#b1e6a8] text-xs">
              Spitze: {fmWeite(members[0].bestWeite)}
            </span>
          )}
        </div>
        <div className="rounded-lg border border-[#222] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#111] border-b border-[#222]">
                <th className="px-3 py-2 text-left text-gray-500 w-10">#</th>
                <th className="px-3 py-2 text-left text-gray-400">Name</th>
                <th className="px-3 py-2 text-left text-gray-400 hidden sm:table-cell">Fahrzeug</th>
                <th className="px-3 py-2 text-right text-gray-400">Weite</th>
                <th className="px-3 py-2 text-right text-gray-400 hidden sm:table-cell">2. Weite</th>
              </tr>
            </thead>
            <tbody>
              {members.map((t, i) => (
                <tr
                  key={t.id}
                  className={`border-b border-[#1a1a1a] ${
                    i === 0 && t.bestWeite ? "bg-[#0f1a0f]" :
                    i % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0d0d0d]"
                  }`}
                >
                  <td className="px-3 py-2 text-center">
                    {t.bestWeite ? (
                      i < 3 ? (
                        <span className="text-base">{MEDAL[i]}</span>
                      ) : (
                        <span className="text-gray-500">{i + 1}</span>
                      )
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-white font-medium">{t.name}</td>
                  <td className="px-3 py-2 text-gray-400 hidden sm:table-cell">
                    {[t.hersteller, t.modell_nr].filter(Boolean).join(" ")}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${
                    i === 0 && t.bestWeite ? "text-[#b1e6a8]" : "text-white"
                  }`}>
                    {fmWeite(t.weite)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-400 hidden sm:table-cell">
                    {fmWeite(t.weite2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const klassesToShow = selectedKlasse === "ALL" ? KLASSEN : [selectedKlasse];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedKlasse("ALL")}
          className={`px-3 py-1 rounded-full text-sm font-bold border transition-all ${
            selectedKlasse === "ALL"
              ? "bg-[#b1e6a8] text-black border-[#b1e6a8]"
              : "bg-[#1a1a1a] text-gray-300 border-[#333] hover:border-[#b1e6a8]"
          }`}
        >
          Alle Klassen
        </button>
        {KLASSEN.map(k => (
          <KlasseChip key={k} k={k} active={selectedKlasse === k} onClick={() => setSelectedKlasse(k)} />
        ))}
      </div>

      {klassesToShow.map(k => renderKlasse(k))}
    </div>
  );
}

// ─── View: Start-Anzeige ─────────────────────────────────────────────────────

function StartAnzeige({ teilnehmer }) {
  const [selectedKlasse, setSelectedKlasse] = useState("F9");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const klassenListe = teilnehmer.filter(t => t.klasse === selectedKlasse);
  const current = klassenListe[currentIdx] || null;

  const prev = () => {
    setCurrentIdx(i => Math.max(0, i - 1));
    setShowResult(false);
  };
  const next = () => {
    setCurrentIdx(i => Math.min(klassenListe.length - 1, i + 1));
    setShowResult(false);
  };

  useEffect(() => {
    setCurrentIdx(0);
    setShowResult(false);
  }, [selectedKlasse]);

  if (!current) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      Keine Teilnehmer in dieser Klasse
    </div>
  );

  const bestWeite = current.weite ?? current.weite2;

  return (
    <div className="flex flex-col gap-6">
      {/* Klassen-Auswahl */}
      <div className="flex flex-wrap gap-2">
        {KLASSEN.map(k => (
          <KlasseChip key={k} k={k} active={selectedKlasse === k}
            onClick={() => setSelectedKlasse(k)} />
        ))}
      </div>

      {/* Hauptanzeige */}
      <div
        className="bg-black border border-[#222] rounded-2xl p-8 relative overflow-hidden"
        style={{ minHeight: 320 }}
      >
        {/* Hintergrund-Muster */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "repeating-linear-gradient(0deg, #b1e6a8 0, #b1e6a8 1px, transparent 0, transparent 50%)",
          backgroundSize: "100% 40px"
        }}></div>

        <div className="relative z-10">
          {/* Klasse + Position */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[#b1e6a8] text-6xl font-black leading-none" style={{ fontFamily: "Arial Black, sans-serif" }}>
                {selectedKlasse}
              </span>
              {KLASSEN_INFO[selectedKlasse] && (
                <div className="text-gray-500 text-sm mt-1">{KLASSEN_INFO[selectedKlasse].gruppe}klasse · max. {KLASSEN_INFO[selectedKlasse].maxPS < 9999 ? KLASSEN_INFO[selectedKlasse].maxPS + " PS" : "offen"}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-sm">Starter</div>
              <div className="text-white text-2xl font-bold">{currentIdx + 1} / {klassenListe.length}</div>
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <div className="text-[#b1e6a8] text-5xl font-black leading-tight" style={{ fontFamily: "Arial Black, sans-serif" }}>
              {current.name}
            </div>
            {current.startnummer && (
              <div className="text-gray-400 text-lg mt-1">#{current.startnummer}</div>
            )}
          </div>

          {/* Fahrzeug-Info */}
          <div className="flex flex-wrap gap-6 mb-6 text-lg">
            {current.hersteller && (
              <div>
                <span className="text-gray-500 text-sm block">Hersteller</span>
                <span className="text-white font-bold">{current.hersteller}</span>
              </div>
            )}
            {current.modell_nr && (
              <div>
                <span className="text-gray-500 text-sm block">Modell</span>
                <span className="text-white font-bold">{current.modell_nr}</span>
              </div>
            )}
            {current.baujahr && (
              <div>
                <span className="text-gray-500 text-sm block">Baujahr</span>
                <span className="text-white font-bold">{current.baujahr}</span>
              </div>
            )}
            {current.ps && (
              <div>
                <span className="text-gray-500 text-sm block">PS</span>
                <span className="text-white font-bold">{current.ps} PS</span>
              </div>
            )}
            {current.kennzeichen && (
              <div>
                <span className="text-gray-500 text-sm block">Kennzeichen</span>
                <span className="text-white font-bold">{current.kennzeichen}</span>
              </div>
            )}
          </div>

          {/* Ergebnis */}
          {bestWeite !== null && bestWeite !== undefined ? (
            <div className="bg-[#0a1a0a] border border-[#2a4a2a] rounded-xl p-4 inline-block">
              <div className="text-gray-400 text-sm">Beste Weite</div>
              <div className="text-[#b1e6a8] text-5xl font-black" style={{ fontFamily: "Arial Black, sans-serif" }}>
                {fmWeite(bestWeite)}
              </div>
              {current.weite2 && current.weite && current.weite !== current.weite2 && (
                <div className="text-gray-500 text-sm mt-1">
                  1. {fmWeite(current.weite)} · 2. {fmWeite(current.weite2)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-600 text-lg italic">Noch kein Ergebnis</div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={prev}
          disabled={currentIdx === 0}
          className="px-6 py-3 rounded-lg border border-[#333] text-white font-bold disabled:opacity-30 hover:border-[#b1e6a8] transition-colors"
        >
          ← Vorheriger
        </button>
        <button
          onClick={next}
          disabled={currentIdx >= klassenListe.length - 1}
          className="px-6 py-3 rounded-lg bg-[#b1e6a8] text-black font-bold disabled:opacity-30 hover:bg-[#c5f0bc] transition-colors"
        >
          Nächster →
        </button>
      </div>

      {/* Mini-Liste */}
      <div className="border border-[#222] rounded-lg overflow-hidden">
        <div className="bg-[#111] px-4 py-2 text-sm text-gray-400 border-b border-[#222]">
          Startliste {selectedKlasse}
        </div>
        <div className="max-h-48 overflow-y-auto">
          {klassenListe.map((t, i) => (
            <div
              key={t.id}
              onClick={() => { setCurrentIdx(i); setShowResult(false); }}
              className={`flex justify-between items-center px-4 py-2 cursor-pointer border-b border-[#1a1a1a] ${
                i === currentIdx ? "bg-[#0f1a0f] border-l-2 border-l-[#b1e6a8]" : "hover:bg-[#111]"
              }`}
            >
              <span className={`text-sm ${i === currentIdx ? "text-[#b1e6a8] font-bold" : "text-gray-300"}`}>
                {t.name}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {t.weite !== null ? fmWeite(t.weite) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── View: Alle Teilnehmer ───────────────────────────────────────────────────

function AlleView({ teilnehmer }) {
  const [search, setSearch] = useState("");
  const filtered = teilnehmer.filter(t =>
    search === "" ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.klasse.toLowerCase().includes(search.toLowerCase()) ||
    t.kennzeichen?.toLowerCase().includes(search.toLowerCase())
  );

  const bezahlt = teilnehmer.filter(t => t.zahlung).length;
  const mitWeite = teilnehmer.filter(t => t.weite !== null).length;

  return (
    <div>
      <div className="flex flex-wrap gap-8 mb-6 text-center">
        {[
          { label: "Gesamt", value: teilnehmer.length, color: "text-white" },
          { label: "Bezahlt", value: `${bezahlt}/${teilnehmer.length}`, color: "text-[#b1e6a8]" },
          { label: "Ergebnisse", value: `${mitWeite}/${teilnehmer.length}`, color: "text-white" },
          ...KLASSEN.map(k => ({
            label: k,
            value: teilnehmer.filter(t => t.klasse === k).length,
            color: "text-gray-300"
          }))
        ].map(s => (
          <div key={s.label} className="flex flex-col">
            <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Name, Klasse oder Kennzeichen suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#111] border border-[#333] rounded px-3 py-2 text-white w-80 focus:border-[#b1e6a8] focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#222]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#111] border-b border-[#222]">
              {["Klasse","Name","Fahrzeug","Kennzeichen","PS","Weite","Zahlung"].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[#b1e6a8] font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} className={`border-b border-[#1a1a1a] ${i % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0d0d0d]"}`}>
                <td className="px-3 py-2">
                  <span className="bg-[#1a2a1a] text-[#b1e6a8] text-xs font-bold px-2 py-0.5 rounded">{t.klasse}</span>
                </td>
                <td className="px-3 py-2 text-white font-medium">{t.name}</td>
                <td className="px-3 py-2 text-gray-400">{[t.hersteller, t.modell_nr].filter(Boolean).join(" ")}</td>
                <td className="px-3 py-2 text-gray-500">{t.kennzeichen}</td>
                <td className="px-3 py-2 text-gray-400 text-right">{t.ps || "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{fmWeite(t.weite)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={t.zahlung ? "text-[#b1e6a8]" : "text-gray-600"}>
                    {t.zahlung ? "✓" : "○"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PIN Login Modal ─────────────────────────────────────────────────────────

const ADMIN_PIN = "202612345";

function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onSuccess();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0d0d0d] border border-[#333] rounded-2xl w-full max-w-sm p-8"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-[#b1e6a8] font-black text-xl mb-1">🔒 Admin-Zugang</h2>
        <p className="text-gray-500 text-sm mb-6">PIN eingeben für vollständigen Zugriff</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(false); }}
            placeholder="PIN"
            autoFocus
            className={`bg-[#0a0a0a] border rounded px-4 py-3 text-white text-center text-xl tracking-widest focus:outline-none ${
              error ? "border-red-500" : "border-[#333] focus:border-[#b1e6a8]"
            }`}
          />
          {error && <p className="text-red-400 text-sm text-center">Falscher PIN</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-[#333] text-gray-300 hover:border-[#555]">
              Abbrechen
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-[#b1e6a8] text-black font-bold hover:bg-[#c5f0bc]">
              Einloggen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

const PUBLIC_TABS = [
  { id: "rangliste",  label: "Rangliste",  icon: "🏆" },
  { id: "start",      label: "Start-Anzeige", icon: "📺" },
];

const ADMIN_TABS = [
  { id: "teilnehmer", label: "Teilnehmer", icon: "🚜" },
  { id: "rangliste",  label: "Rangliste",  icon: "🏆" },
  { id: "start",      label: "Start-Anzeige", icon: "📺" },
  { id: "alle",       label: "Alle Teilnehmer", icon: "📋" },
];

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem("ttt_admin") === "1");
  const [showPinModal, setShowPinModal] = useState(false);
  const TABS = isAdmin ? ADMIN_TABS : PUBLIC_TABS;
  const [tab, setTab] = useState(isAdmin ? "teilnehmer" : "rangliste");
  const [teilnehmer, setTeilnehmer] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appwriteOk, setAppwriteOk] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load data on startup
  useEffect(() => {
    (async () => {
      // Try Appwrite first
      try {
        const docs = await loadFromAppwrite();
        if (docs.length > 0) {
          setTeilnehmer(docs);
          saveLocal(docs);
          setAppwriteOk(true);
          setLoading(false);
          return;
        }
        setAppwriteOk(true);
      } catch (e) {
        console.warn("Appwrite nicht verfügbar:", e.message);
        setAppwriteOk(false);
      }

      // Try localStorage
      const local = loadLocal();
      if (local && local.length > 0) {
        setTeilnehmer(local);
      } else {
        // Fall back to initial data
        setTeilnehmer(INITIAL_TEILNEHMER);
        saveLocal(INITIAL_TEILNEHMER);
      }
      setLoading(false);
    })();
  }, []);

  const handleAdd = useCallback(async (neu) => {
    setTeilnehmer(prev => {
      const next = [...prev, neu];
      saveLocal(next);
      return next;
    });
    if (appwriteOk) {
      try { await saveToAppwrite(neu); } catch (e) { console.warn(e); }
    }
  }, [appwriteOk]);

  const handleUpdate = useCallback(async (updated) => {
    setTeilnehmer(prev => {
      const next = prev.map(t => t.id === updated.id ? updated : t);
      saveLocal(next);
      return next;
    });

    if (appwriteOk) {
      setSaving(true);
      try {
        await updateInAppwrite(updated);
      } catch (e) {
        // If document doesn't exist yet, create it
        try { await saveToAppwrite(updated); } catch {}
      }
      setSaving(false);
    }
  }, [appwriteOk]);

  const handleImportToAppwrite = async () => {
    setSaving(true);
    let ok = 0;
    for (const t of teilnehmer) {
      try {
        await saveToAppwrite(t);
        ok++;
      } catch (e) {
        try { await updateInAppwrite(t); ok++; } catch {}
      }
    }
    setSaving(false);
    setAppwriteOk(true);
    alert(`${ok} Teilnehmer in Appwrite gespeichert!`);
  };

  // If tab is not available in current mode, reset it
  useEffect(() => {
    const validTabs = TABS.map(t => t.id);
    if (!validTabs.includes(tab)) setTab(TABS[0].id);
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#b1e6a8] text-2xl animate-pulse">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-[#1a1a1a] bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[#b1e6a8] font-black text-xl leading-tight" style={{ fontFamily: "Arial Black, sans-serif" }}>
                TRECKER TRECK
              </div>
              <div className="text-white text-xs tracking-widest">SCHWARME 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {saving && <span className="text-yellow-400 animate-pulse">💾 Speichert...</span>}
            <span className={`px-2 py-1 rounded text-xs ${appwriteOk ? "bg-green-900 text-green-300" : "bg-gray-900 text-gray-500"}`}>
              {appwriteOk ? "☁ Appwrite" : "💾 Lokal"}
            </span>
            {!appwriteOk && teilnehmer.length > 0 && isAdmin && (
              <button
                onClick={handleImportToAppwrite}
                className="px-2 py-1 bg-[#1a2a1a] border border-[#2a4a2a] text-[#b1e6a8] rounded text-xs hover:bg-[#2a3a2a] transition-colors"
              >
                → Appwrite importieren
              </button>
            )}
            {isAdmin ? (
              <button
                onClick={() => { sessionStorage.removeItem("ttt_admin"); setIsAdmin(false); setTab("rangliste"); }}
                className="px-2 py-1 bg-[#1a1a1a] border border-[#333] text-gray-400 rounded text-xs hover:text-white transition-colors"
                title="Abmelden"
              >
                🔓 Abmelden
              </button>
            ) : (
              <button
                onClick={() => setShowPinModal(true)}
                className="px-2 py-1 bg-[#1a1a1a] border border-[#333] text-gray-400 rounded text-xs hover:text-white transition-colors"
                title="Admin-Login"
              >
                🔒
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-[#b1e6a8] text-[#b1e6a8]"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {showPinModal && (
        <PinModal
          onSuccess={() => {
            sessionStorage.setItem("ttt_admin", "1");
            setIsAdmin(true);
            setTab("teilnehmer");
            setShowPinModal(false);
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === "teilnehmer" && isAdmin && (
          <TeilnehmerView
            teilnehmer={teilnehmer}
            onUpdate={handleUpdate}
            onAdd={handleAdd}
            appwriteOk={appwriteOk}
          />
        )}
        {tab === "rangliste" && <RanglisteView teilnehmer={teilnehmer} />}
        {tab === "start" && <StartAnzeige teilnehmer={teilnehmer} />}
        {tab === "alle" && <AlleView teilnehmer={teilnehmer} />}
      </main>
    </div>
  );
}
