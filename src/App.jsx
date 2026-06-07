import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { databases, ID, Query, DB_ID, COLLECTION_ID, SETTINGS_COL_ID } from "./lib/appwrite";
import { INITIAL_TEILNEHMER, KLASSEN, KLASSEN_MIT_FAN, KLASSEN_INFO } from "./data/initialData";

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
    fan_votes: doc.fan_votes ?? 0,
  }));
}

async function saveToAppwrite(t) {
  const data = {
    klasse: t.klasse, zahlung: t.zahlung, name: t.name,
    mail: t.mail, nummer: t.nummer, adresse: t.adresse,
    kennzeichen: t.kennzeichen, modell_nr: t.modell_nr,
    hersteller: t.hersteller, baujahr: t.baujahr, ps: t.ps,
    weite: t.weite, weite2: t.weite2, anmerkungen: t.anmerkungen,
    startnummer: t.startnummer, fan_votes: t.fan_votes ?? 0,
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
    startnummer: t.startnummer, fan_votes: t.fan_votes ?? 0,
  };
  return databases.updateDocument(DB_ID, COLLECTION_ID, t.id, data);
}

async function loadLiveState() {
  try {
    const doc = await databases.getDocument(DB_ID, SETTINGS_COL_ID, "live");
    return { liveKlasse: doc.liveKlasse || null, liveTeilnehmerId: doc.liveTeilnehmerId || null };
  } catch {
    return null;
  }
}

async function saveLiveState(liveKlasse, liveTeilnehmerId) {
  try {
    await databases.updateDocument(DB_ID, SETTINGS_COL_ID, "live", {
      liveKlasse: liveKlasse || null,
      liveTeilnehmerId: liveTeilnehmerId || null,
    });
  } catch {
    try {
      await databases.createDocument(DB_ID, SETTINGS_COL_ID, "live", {
        liveKlasse: liveKlasse || null,
        liveTeilnehmerId: liveTeilnehmerId || null,
      });
    } catch {}
  }
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

// ─── Modal: Fahrerdaten ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  klasse: "F9", zahlung: false, name: "", mail: "", nummer: "",
  adresse: "", kennzeichen: "", modell_nr: "", hersteller: "",
  baujahr: "", ps: "", anmerkungen: "", startnummer: "",
  weite: null, weite2: null, fan_votes: 0,
};

function FahrerdatenModal({ teilnehmer, onSave, onUpdate, onDelete, onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const selectTeilnehmer = (t) => {
    setSelectedId(t.id);
    setIsNew(false);
    setForm({ ...t });
  };

  const startNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setForm({ ...EMPTY_FORM });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    if (isNew) {
      await onSave({ ...form, id: crypto.randomUUID() });
    } else {
      await onUpdate({ ...form });
    }
    setSaving(false);
    setSelectedId(null);
    setIsNew(false);
    setForm({ ...EMPTY_FORM });
  };

  const field = (label, key, opts = {}) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        type={opts.type || "text"}
        value={form[key] ?? ""}
        onChange={e => set(key, e.target.value)}
        placeholder={opts.placeholder || ""}
        required={opts.required}
        className="bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white focus:border-[#b1e6a8] focus:outline-none text-sm"
      />
    </div>
  );

  const filtered = teilnehmer.filter(t =>
    search === "" ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.klasse.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (a.klasse < b.klasse) return -1;
    if (a.klasse > b.klasse) return 1;
    return a.name.localeCompare(b.name, "de");
  });

  const showForm = isNew || selectedId !== null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0d0d0d] border border-[#333] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] shrink-0">
          <h2 className="text-[#b1e6a8] font-black text-xl">✏️ Fahrerdaten ändern</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Linke Spalte: Teilnehmerliste */}
          <div className="w-64 shrink-0 border-r border-[#222] flex flex-col">
            <div className="p-3 border-b border-[#222]">
              <input
                type="text"
                placeholder="Suchen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-[#111] border border-[#333] rounded px-2 py-1.5 text-white w-full focus:border-[#b1e6a8] focus:outline-none text-xs"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              <button
                onClick={startNew}
                className={`w-full text-left px-4 py-2.5 text-sm border-b border-[#1a1a1a] transition-colors ${
                  isNew ? "bg-[#0f1a0f] text-[#b1e6a8] font-bold" : "text-gray-400 hover:bg-[#111] hover:text-white"
                }`}
              >
                + Neuer Teilnehmer
              </button>
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTeilnehmer(t)}
                  className={`w-full text-left px-4 py-2.5 border-b border-[#1a1a1a] transition-colors ${
                    selectedId === t.id ? "bg-[#0f1a0f] text-[#b1e6a8]" : "text-gray-300 hover:bg-[#111] hover:text-white"
                  }`}
                >
                  <div className="text-xs font-bold truncate">{t.name}</div>
                  <div className="text-xs text-gray-600">{t.klasse}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Rechte Spalte: Formular */}
          <div className="flex-1 overflow-y-auto">
            {!showForm ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Teilnehmer auswählen oder neu anlegen
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 text-[#b1e6a8] font-bold text-sm">
                  {isNew ? "Neuer Teilnehmer" : `Bearbeiten: ${form.name}`}
                </div>

                {/* Klasse */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Klasse</label>
                  <div className="flex flex-wrap gap-2">
                    {KLASSEN.map(k => (
                      <button key={k} type="button" onClick={() => set("klasse", k)}
                        className={`px-3 py-1 rounded-full text-sm font-bold border transition-all ${
                          form.klasse === k ? "bg-[#b1e6a8] text-black border-[#b1e6a8]" : "bg-[#1a1a1a] text-gray-300 border-[#333] hover:border-[#b1e6a8]"
                        }`}>{k}</button>
                    ))}
                  </div>
                </div>

                {field("Name *", "name", { required: true, placeholder: "Vor- und Nachname" })}
                {field("E-Mail", "mail", { type: "email", placeholder: "name@example.de" })}
                {field("Telefon", "nummer", { placeholder: "0171 ..." })}
                {field("Adresse", "adresse", { placeholder: "Straße, PLZ Ort" })}
                {field("Kennzeichen", "kennzeichen", { placeholder: "VER-XX 123" })}
                {field("Hersteller", "hersteller", { placeholder: "Fendt, IHC, Deutz ..." })}
                {field("Modell / Nr.", "modell_nr", { placeholder: "936, Farmer 311 ..." })}
                {field("Baujahr", "baujahr", { placeholder: "1985" })}
                {field("PS", "ps", { placeholder: "120" })}

                {/* Weiten */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">1. Weite (m)</label>
                  <input type="number" step="0.01" min="0"
                    value={form.weite ?? ""}
                    onChange={e => set("weite", e.target.value === "" ? null : parseFloat(e.target.value))}
                    className="bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white focus:border-[#b1e6a8] focus:outline-none text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">2. Weite (m)</label>
                  <input type="number" step="0.01" min="0"
                    value={form.weite2 ?? ""}
                    onChange={e => set("weite2", e.target.value === "" ? null : parseFloat(e.target.value))}
                    className="bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white focus:border-[#b1e6a8] focus:outline-none text-sm"
                  />
                </div>

                {/* Zahlung */}
                <div className="flex items-center gap-3 sm:col-span-2">
                  <button type="button" onClick={() => set("zahlung", !form.zahlung)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      form.zahlung ? "bg-[#b1e6a8] border-[#b1e6a8] text-black" : "border-[#444]"
                    }`}>
                    {form.zahlung && <span className="text-xs font-bold">✓</span>}
                  </button>
                  <span className="text-gray-300 text-sm">Startgebühr bezahlt</span>
                </div>

                {/* Anmerkungen */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Anmerkungen</label>
                  <textarea value={form.anmerkungen} onChange={e => set("anmerkungen", e.target.value)}
                    rows={2}
                    className="bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white focus:border-[#b1e6a8] focus:outline-none text-sm resize-none"
                  />
                </div>

                <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
                  {!isNew && (
                    <button type="button"
                      onClick={() => {
                        if (window.confirm(`"${form.name}" wirklich löschen?`)) {
                          onDelete(form);
                          setSelectedId(null);
                          setIsNew(false);
                          setForm({ ...EMPTY_FORM });
                        }
                      }}
                      className="px-4 py-2 rounded-lg border border-red-800 text-red-500 hover:bg-red-900/30 transition-colors text-sm mr-auto">
                      🗑 Löschen
                    </button>
                  )}
                  <button type="button" onClick={() => { setSelectedId(null); setIsNew(false); }}
                    className="px-5 py-2 rounded-lg border border-[#333] text-gray-300 hover:border-[#555] transition-colors text-sm">
                    Abbrechen
                  </button>
                  <button type="submit" disabled={saving || !form.name.trim()}
                    className="px-6 py-2 rounded-lg bg-[#b1e6a8] text-black font-bold disabled:opacity-40 hover:bg-[#c5f0bc] transition-colors text-sm">
                    {saving ? "Speichert..." : isNew ? "Anlegen" : "Speichern"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View: Teilnehmer ────────────────────────────────────────────────────────

function TeilnehmerView({ teilnehmer, onUpdate, appwriteOk, liveKlasse, liveTeilnehmerId, onSetLiveKlasse, onSetLiveTeilnehmer }) {
  const [selectedKlasse, setSelectedKlasse] = useState("F9");
  const [search, setSearch] = useState("");

  const klasse_list = teilnehmer.filter(
    t => t.klasse === selectedKlasse &&
    (search === "" || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  const bezahlt = teilnehmer.filter(t => t.klasse === selectedKlasse && t.zahlung).length;
  const gesamt = teilnehmer.filter(t => t.klasse === selectedKlasse).length;
  const mitWeite = teilnehmer.filter(t => t.klasse === selectedKlasse && t.weite !== null).length;

  const handleKlasseClick = (k) => {
    setSelectedKlasse(k);
  };

  return (
    <div>
      {/* Klassen-Filter mit eigenem Live-Button */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {KLASSEN.map(k => {
            const isLive = k === liveKlasse;
            const isSelected = k === selectedKlasse;
            return (
              <div key={k} className="flex items-center gap-0.5">
                <button
                  onClick={() => handleKlasseClick(k)}
                  className={`px-3 py-1 rounded-l-full text-sm font-bold border-y border-l transition-all ${
                    isSelected
                      ? "bg-[#b1e6a8] text-black border-[#b1e6a8]"
                      : "bg-[#1a1a1a] text-gray-300 border-[#333] hover:border-[#b1e6a8]"
                  }`}
                >
                  {k}
                </button>
                <button
                  onClick={() => onSetLiveKlasse(isLive ? null : k)}
                  title={isLive ? "Live deaktivieren" : "Klasse live schalten"}
                  className={`px-1.5 py-1 rounded-r-full text-xs border-y border-r transition-all ${
                    isLive
                      ? "bg-[#b1e6a8] text-black border-[#b1e6a8] animate-pulse font-bold"
                      : "bg-[#111] text-gray-600 border-[#333] hover:border-[#b1e6a8] hover:text-[#b1e6a8]"
                  }`}
                >
                  ●
                </button>
              </div>
            );
          })}
        </div>
        {liveKlasse && (
          <div className="mt-2 text-xs text-[#b1e6a8] flex items-center gap-1">
            <span className="animate-pulse">●</span> Klasse <strong>{liveKlasse}</strong> ist live
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-6 mb-4 text-sm items-center">
        <span className="text-gray-400">Klasse <span className="text-[#b1e6a8] font-bold">{selectedKlasse}</span></span>
        <span className="text-gray-400">Teilnehmer: <span className="text-white font-bold">{gesamt}</span></span>
        <span className="text-gray-400">Bezahlt: <span className="text-[#b1e6a8] font-bold">{bezahlt}/{gesamt}</span></span>
        <span className="text-gray-400">Ergebnisse: <span className="text-white font-bold">{mitWeite}/{gesamt}</span></span>
      </div>

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
              <th className="px-3 py-3 text-left text-[#b1e6a8] font-semibold w-24">Startnummer</th>
              <th className="px-3 py-3 text-left text-[#b1e6a8] font-semibold w-16">Live</th>
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
                  t.id === liveTeilnehmerId ? "bg-[#0f1a0f] border-l-4 border-l-[#b1e6a8]" :
                  i % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0d0d0d]"
                } hover:bg-[#141a14]`}
              >
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={t.startnummer || ""}
                    onChange={e => onUpdate({ ...t, startnummer: e.target.value })}
                    placeholder="—"
                    className="w-12 bg-[#111] border border-[#333] rounded px-1 py-1 text-[#b1e6a8] font-bold text-left focus:border-[#b1e6a8] focus:outline-none text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => {
                      const newId = t.id === liveTeilnehmerId ? null : t.id;
                      onSetLiveTeilnehmer(newId);
                      if (newId) onSetLiveKlasse(t.klasse);
                    }}
                    className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
                      t.id === liveTeilnehmerId
                        ? "bg-[#b1e6a8] text-black border-[#b1e6a8] animate-pulse"
                        : "border-[#333] text-gray-500 hover:border-[#b1e6a8] hover:text-[#b1e6a8]"
                    }`}
                  >
                    {t.id === liveTeilnehmerId ? "● Live" : "Live"}
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

function RanglisteView({ teilnehmer, liveKlasse }) {
  const [selectedKlasse, setSelectedKlasse] = useState("ALL");

  const renderFanKlasse = () => {
    const sorted = [...teilnehmer]
      .filter(t => (t.fan_votes ?? 0) > 0)
      .sort((a, b) => (b.fan_votes ?? 0) - (a.fan_votes ?? 0));
    const total = teilnehmer.reduce((s, t) => s + (t.fan_votes ?? 0), 0);
    return (
      <div key="FAN" className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[#b1e6a8] font-bold text-lg">❤️ FAN</span>
          <span className="text-gray-500 text-sm">Fan-Abstimmung</span>
          <span className="text-gray-600 text-xs">größte Fan-Gruppe</span>
          {total > 0 && <span className="ml-auto text-[#b1e6a8] text-xs">{total} Stimmen</span>}
        </div>
        {sorted.length === 0 ? (
          <div className="text-gray-600 text-sm italic px-3 py-2 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
            Noch keine Stimmen abgegeben
          </div>
        ) : (
          <div className="rounded-lg border border-[#222] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#111] border-b border-[#222]">
                  <th className="px-3 py-2 text-left text-gray-500 w-10">#</th>
                  <th className="px-3 py-2 text-left text-gray-400">Name</th>
                  <th className="px-3 py-2 text-left text-gray-400 hidden sm:table-cell">Klasse</th>
                  <th className="px-3 py-2 text-right text-gray-400">Stimmen</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => (
                  <tr key={t.id} className={`border-b border-[#1a1a1a] ${i === 0 ? "bg-[#0f1a0f]" : i % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0d0d0d]"}`}>
                    <td className="px-3 py-2 text-center">
                      {i < 3 ? <span className="text-base">{MEDAL[i]}</span> : <span className="text-gray-500">{i + 1}</span>}
                    </td>
                    <td className="px-3 py-2 text-white font-medium">
                      {t.startnummer && <span className="text-[#b1e6a8] font-bold mr-2 text-xs">#{t.startnummer}</span>}
                      {t.name}
                    </td>
                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{t.klasse}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#b1e6a8]">{t.fan_votes ?? 0} ❤️</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderKlasse = (k, isLive = false) => {
    const allMembers = teilnehmer
      .filter(t => t.klasse === k)
      .sort((a, b) => {
        const a2 = a.weite2 ?? null;
        const b2 = b.weite2 ?? null;
        // Beide haben 2. Weite → nach 2. Weite sortieren
        if (a2 !== null && b2 !== null) return b2 - a2;
        // Nur einer hat 2. Weite → der gewinnt
        if (a2 !== null) return -1;
        if (b2 !== null) return 1;
        // Keiner hat 2. Weite → nach 1. Weite sortieren
        return (b.weite ?? 0) - (a.weite ?? 0);
      });

    // Nur Teilnehmer mit Ergebnis anzeigen (mind. 1. Weite)
    const members = allMembers.filter(t => t.weite != null);

    if (allMembers.length === 0) return null;

    return (
      <div key={k} className={`mb-6 ${isLive ? "ring-2 ring-[#b1e6a8] rounded-xl p-3" : ""}`}>
        <div className="flex items-center gap-3 mb-2">
          {isLive && (
            <span className="flex items-center gap-1 bg-[#b1e6a8] text-black text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
              ● LIVE
            </span>
          )}
          <span className="text-[#b1e6a8] font-bold text-lg">{k}</span>
          <span className="text-gray-500 text-sm">{KLASSEN_INFO[k]?.gruppe}</span>
          <span className="text-gray-600 text-xs">{members.length}/{allMembers.length} Ergebnisse</span>
          {members.length > 0 && (
            <span className="ml-auto text-[#b1e6a8] text-xs">
              Spitze: {fmWeite(members[0].weite2 ?? members[0].weite)}
            </span>
          )}
        </div>
        {members.length === 0 ? (
          <div className="text-gray-600 text-sm italic px-3 py-2 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
            Noch keine Ergebnisse eingetragen
          </div>
        ) : (
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
                      i === 0 ? "bg-[#0f1a0f]" :
                      i % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0d0d0d]"
                    }`}
                  >
                    <td className="px-3 py-2 text-center">
                      {i < 3 ? (
                        <span className="text-base">{MEDAL[i]}</span>
                      ) : (
                        <span className="text-gray-500">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-white font-medium">
                      {t.startnummer && (
                        <span className="text-[#b1e6a8] font-bold mr-2 text-xs">#{t.startnummer}</span>
                      )}
                      {t.name}
                    </td>
                    <td className="px-3 py-2 text-gray-400 hidden sm:table-cell">
                      {[t.hersteller, t.modell_nr].filter(Boolean).join(" ")}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono font-bold ${
                      i === 0 ? "text-[#b1e6a8]" : "text-white"
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
        )}
      </div>
    );
  };

  const klassesToShow = selectedKlasse === "ALL"
    ? [liveKlasse, ...KLASSEN.filter(k => k !== liveKlasse)].filter(Boolean)
    : [selectedKlasse];

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
        <button
          onClick={() => setSelectedKlasse("FAN")}
          className={`px-3 py-1 rounded-full text-sm font-bold border transition-all ${
            selectedKlasse === "FAN"
              ? "bg-pink-400 text-black border-pink-400"
              : "bg-[#1a1a1a] text-gray-300 border-[#333] hover:border-pink-400"
          }`}
        >
          ❤️ FAN
        </button>
      </div>

      {klassesToShow.map(k => renderKlasse(k, k === liveKlasse))}
      {(selectedKlasse === "ALL" || selectedKlasse === "FAN") && renderFanKlasse()}
    </div>
  );
}

// ─── View: Start-Anzeige ─────────────────────────────────────────────────────

function StartAnzeige({ teilnehmer, liveKlasse, liveTeilnehmerId }) {
  // Klassen in der richtigen Reihenfolge: Live-Klasse zuerst
  const klassenOrder = liveKlasse
    ? [liveKlasse, ...KLASSEN.filter(k => k !== liveKlasse)]
    : KLASSEN;

  // Alle Teilnehmer nach Klasse + Startnummer sortiert
  const sorted = klassenOrder.flatMap(k =>
    teilnehmer
      .filter(t => t.klasse === k)
      .sort((a, b) => (parseInt(a.startnummer) || 9999) - (parseInt(b.startnummer) || 9999))
  );

  const liveT = sorted.find(t => t.id === liveTeilnehmerId) || null;

  return (
    <div className="flex flex-col gap-4">

      {/* Live-Anzeige (immer sichtbar, wenn jemand live ist) */}
      {liveT && (
        <div className="bg-black border-2 border-[#b1e6a8] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: "repeating-linear-gradient(0deg, #b1e6a8 0, #b1e6a8 1px, transparent 0, transparent 50%)",
            backgroundSize: "100% 40px"
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center gap-1 bg-[#b1e6a8] text-black text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
                ● JETZT AM START
              </span>
              <span className="text-gray-500 text-sm">{liveT.klasse} · {KLASSEN_INFO[liveT.klasse]?.gruppe}</span>
            </div>

            {/* Fahrender Trecker */}
            <div className="overflow-hidden mb-4" style={{ height: 72 }}>
              <img
                src="/trecker.png"
                alt="Trecker"
                style={{
                  height: 72,
                  width: "auto",
                  animation: "tractorDrive 7s linear infinite",
                  willChange: "transform",
                }}
              />
            </div>

            <style>{`
              @keyframes tractorDrive {
                0%   { transform: translateX(-520px); }
                100% { transform: translateX(110vw); }
              }
            `}</style>

            <div className="flex items-baseline gap-4 mb-3">
              {liveT.startnummer && (
                <span className="text-[#b1e6a8] text-4xl font-black" style={{ fontFamily: "Arial Black, sans-serif" }}>
                  #{liveT.startnummer}
                </span>
              )}
              <span className="text-white text-4xl font-black leading-tight" style={{ fontFamily: "Arial Black, sans-serif" }}>
                {liveT.name}
              </span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              {liveT.hersteller && <div><span className="text-gray-500 block text-xs">Hersteller</span><span className="text-white font-bold">{liveT.hersteller}</span></div>}
              {liveT.modell_nr  && <div><span className="text-gray-500 block text-xs">Modell</span><span className="text-white font-bold">{liveT.modell_nr}</span></div>}
              {liveT.baujahr    && <div><span className="text-gray-500 block text-xs">Baujahr</span><span className="text-white font-bold">{liveT.baujahr}</span></div>}
              {liveT.ps         && <div><span className="text-gray-500 block text-xs">PS</span><span className="text-white font-bold">{liveT.ps} PS</span></div>}
              {liveT.kennzeichen && <div><span className="text-gray-500 block text-xs">Kennzeichen</span><span className="text-white font-bold">{liveT.kennzeichen}</span></div>}
            </div>
            {(liveT.weite || liveT.weite2) && (
              <div className="mt-4 bg-[#0a1a0a] border border-[#2a4a2a] rounded-xl px-4 py-3 inline-block">
                <div className="text-gray-400 text-xs mb-1">Beste Weite</div>
                <div className="text-[#b1e6a8] text-3xl font-black" style={{ fontFamily: "Arial Black, sans-serif" }}>
                  {fmWeite(Math.max(liveT.weite ?? 0, liveT.weite2 ?? 0))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Startliste nach Klassen */}
      {klassenOrder.map(k => {
        const liste = sorted.filter(t => t.klasse === k);
        if (liste.length === 0) return null;
        return (
          <div key={k} className="border border-[#222] rounded-lg overflow-hidden">
            <div className={`px-4 py-2 text-sm font-bold border-b border-[#222] flex items-center gap-2 ${
              k === liveKlasse ? "bg-[#0f1a0f] text-[#b1e6a8]" : "bg-[#111] text-gray-400"
            }`}>
              {k === liveKlasse && <span className="text-[#b1e6a8] text-xs animate-pulse">●</span>}
              {k} <span className="font-normal text-gray-500">{KLASSEN_INFO[k]?.gruppe}</span>
            </div>
            {liste.map(t => {
              const isLive = t.id === liveTeilnehmerId;
              return (
                <div
                  key={t.id}
                  className={`flex items-center px-4 py-2.5 border-b border-[#1a1a1a] ${
                    isLive ? "bg-[#0f1a0f] border-l-4 border-l-[#b1e6a8]" : "bg-[#0a0a0a]"
                  }`}
                >
                  {t.startnummer && (
                    <span className="text-[#b1e6a8] font-bold text-sm w-10 shrink-0">#{t.startnummer}</span>
                  )}
                  <span className={`flex-1 text-sm ${isLive ? "text-[#b1e6a8] font-bold" : "text-gray-300"}`}>
                    {t.name}
                  </span>
                  <span className="text-xs text-gray-600 font-mono mr-3">
                    {t.weite != null ? fmWeite(t.weite) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── View: Alle Teilnehmer ───────────────────────────────────────────────────

function AlleView({ teilnehmer, onUpdate, isAdmin }) {
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
              {["Startnummer","Klasse","Name","Fahrzeug","Kennzeichen","PS","Weite","Zahlung"].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[#b1e6a8] font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} className={`border-b border-[#1a1a1a] ${i % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0d0d0d]"}`}>
                <td className="px-3 py-2 text-center">
                  {isAdmin ? (
                    <input
                      type="text"
                      value={t.startnummer || ""}
                      onChange={e => onUpdate({ ...t, startnummer: e.target.value })}
                      placeholder="—"
                      className="w-12 bg-[#111] border border-[#333] rounded px-1 py-1 text-[#b1e6a8] font-bold text-center focus:border-[#b1e6a8] focus:outline-none text-sm"
                    />
                  ) : (
                    <span className="text-[#b1e6a8] font-bold text-sm">{t.startnummer || "—"}</span>
                  )}
                </td>
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

// ─── Countdown ───────────────────────────────────────────────────────────────

const EVENT_START = new Date("2026-06-07T09:00:00");

function useCountdown() {
  const [remaining, setRemaining] = useState(() => EVENT_START - Date.now());
  useEffect(() => {
    const iv = setInterval(() => setRemaining(EVENT_START - Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  return remaining;
}

function CountdownScreen({ onAdminClick }) {
  const remaining = useCountdown();
  const total = Math.max(0, remaining);
  const days    = Math.floor(total / 86400000);
  const hours   = Math.floor((total % 86400000) / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);

  const pad = n => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4" style={{ fontFamily: "Arial, sans-serif" }}>
      <img src="/logo.jpg" alt="Trecker Treck Team Weser" className="h-24 w-auto rounded mb-8" />
      <div className="text-[#b1e6a8] font-black text-2xl mb-2 tracking-widest" style={{ fontFamily: "Arial Black, sans-serif" }}>
        TRECKER TRECK SCHWARME 2026
      </div>
      <div className="text-gray-400 text-sm mb-10">Die Veranstaltung startet am 07.06.2026 um 09:00 Uhr</div>

      <div className="flex gap-4 sm:gap-8 mb-12">
        {[
          { label: "Tage",    value: days },
          { label: "Stunden", value: hours },
          { label: "Minuten", value: minutes },
          { label: "Sekunden",value: seconds },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center">
            <div
              className="text-[#b1e6a8] font-black text-5xl sm:text-7xl leading-none w-20 sm:w-28 text-center border border-[#222] rounded-xl bg-[#0a0a0a] py-3"
              style={{ fontFamily: "Arial Black, sans-serif" }}
            >
              {pad(value)}
            </div>
            <div className="text-gray-500 text-xs mt-2 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 mt-2">
        <p className="text-gray-500 text-sm text-center max-w-xs">
          Du bist genauso gespannt wie wir? Schau doch vorbei, was in den letzten Jahren abging:
        </p>
        <div className="flex gap-3">
          <a
            href="https://www.instagram.com/trecker_treck_schwarme/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </a>
          <a
            href="https://trecker-treck-schwarme.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#333] text-gray-300 text-sm font-bold rounded-full hover:border-[#b1e6a8] hover:text-[#b1e6a8] transition-colors"
          >
            🌐 Website
          </a>
        </div>
      </div>

      <button
        onClick={onAdminClick}
        className="mt-8 text-gray-700 text-xs hover:text-gray-400 transition-colors"
      >
        🔒 Admin
      </button>
    </div>
  );
}

// ─── Fan Voting ──────────────────────────────────────────────────────────────

function FanVoting({ teilnehmer, onVote, onUnvote }) {
  const [votedId, setVotedId] = useState(() => localStorage.getItem("ttt_fan_vote") || null);
  const [search, setSearch] = useState("");

  const handleVote = (t) => {
    if (votedId) return;
    onVote(t);
    setVotedId(t.id);
    localStorage.setItem("ttt_fan_vote", t.id);
  };

  const handleChangeVote = (newT) => {
    // Alte Stimme entfernen
    const oldT = teilnehmer.find(t => t.id === votedId);
    if (oldT) onUnvote(oldT);
    // Neue Stimme setzen
    onVote(newT);
    setVotedId(newT.id);
    localStorage.setItem("ttt_fan_vote", newT.id);
  };

  const handleRemoveVote = () => {
    const oldT = teilnehmer.find(t => t.id === votedId);
    if (oldT) onUnvote(oldT);
    setVotedId(null);
    localStorage.removeItem("ttt_fan_vote");
  };

  const sorted = [...teilnehmer].sort((a, b) => {
    if (a.klasse < b.klasse) return -1;
    if (a.klasse > b.klasse) return 1;
    return a.name.localeCompare(b.name, "de");
  });
  const filtered = sorted.filter(t =>
    search === "" ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.klasse.toLowerCase().includes(search.toLowerCase())
  );
  const votedFor = teilnehmer.find(t => t.id === votedId);
  const maxVotes = Math.max(...teilnehmer.map(t => t.fan_votes ?? 0), 1);

  return (
    <div>
      {/* Voted Banner */}
      {votedFor ? (
        <div className="mb-6 bg-[#0f1a0f] border border-[#b1e6a8] rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">❤️</span>
          <div className="flex-1">
            <div className="text-[#b1e6a8] font-bold">Du hast für <span className="text-white">{votedFor.name}</span> gevoted!</div>
            <div className="text-gray-500 text-xs mt-0.5">Klasse {votedFor.klasse} · {votedFor.fan_votes ?? 0} Stimmen</div>
          </div>
          <button
            onClick={handleRemoveVote}
            className="text-xs text-gray-500 hover:text-white border border-[#333] hover:border-[#555] px-3 py-1 rounded-full transition-colors"
          >
            Stimme ändern
          </button>
        </div>
      ) : (
        <div className="mb-6 bg-[#0d0d0d] border border-[#333] rounded-xl px-5 py-4 text-gray-400 text-sm">
          ❤️ Wähle deinen Favoriten — du hast <strong className="text-white">eine Stimme</strong>
        </div>
      )}

      {/* Suche */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Name oder Klasse suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#111] border border-[#333] rounded px-3 py-2 text-white w-full max-w-sm focus:border-[#b1e6a8] focus:outline-none text-sm"
        />
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2">
        {filtered.map((t) => {
          const isVoted = t.id === votedId;
          const votes = t.fan_votes ?? 0;
          const barWidth = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
          return (
            <div
              key={t.id}
              className={`relative rounded-xl border px-4 py-3 flex items-center gap-3 overflow-hidden transition-all ${
                isVoted
                  ? "border-[#b1e6a8] bg-[#0f1a0f]"
                  : votedId
                  ? "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#b1e6a8] cursor-pointer"
                  : "border-[#222] bg-[#0a0a0a] hover:border-[#b1e6a8] cursor-pointer"
              }`}
              onClick={() => votedId && !isVoted ? handleChangeVote(t) : !votedId ? handleVote(t) : undefined}
            >
              {/* Vote-Bar Hintergrund */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-[#b1e6a8] opacity-5 transition-all"
                style={{ width: `${barWidth}%` }}
              />
              <div className="relative flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className={`font-bold truncate ${isVoted ? "text-[#b1e6a8]" : "text-white"}`}>
                    {t.name}
                    {t.startnummer && <span className="text-gray-500 font-normal ml-2 text-xs">#{t.startnummer}</span>}
                  </div>
                  <div className="text-xs text-gray-500">{t.klasse} · {[t.hersteller, t.modell_nr].filter(Boolean).join(" ")}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-bold text-sm ${votes > 0 ? "text-[#b1e6a8]" : "text-gray-600"}`}>{votes}</span>
                  <span className="text-lg">{isVoted ? "❤️" : votedId ? "🤍" : "🤍"}</span>
                </div>
              </div>
            </div>
          );
        })}
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
  { id: "fan",        label: "Fan-Vote",   icon: "❤️" },
];

const ADMIN_TABS = [
  { id: "teilnehmer", label: "Teilnehmer", icon: "🚜" },
  { id: "rangliste",  label: "Rangliste",  icon: "🏆" },
  { id: "start",      label: "Start-Anzeige", icon: "📺" },
  { id: "fan",        label: "Fan-Vote",   icon: "❤️" },
];

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem("ttt_admin") === "1");
  const [previewMode, setPreviewMode] = useState(false);
  const [showFahrerdaten, setShowFahrerdaten] = useState(false);
  const [liveKlasse, setLiveKlasse] = useState(null);
  const [liveTeilnehmerId, setLiveTeilnehmerId] = useState(null);

  // Live-State aus Appwrite laden und alle 3s pollen
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const state = await loadLiveState();
      if (!cancelled && state) {
        setLiveKlasse(state.liveKlasse);
        setLiveTeilnehmerId(state.liveTeilnehmerId);
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Teilnehmerdaten alle 5s mergen — nur geänderte Felder übernehmen
  useEffect(() => {
    let cancelled = false;
    const pollData = async () => {
      try {
        const docs = await loadFromAppwrite();
        if (cancelled || docs.length === 0) return;
        setTeilnehmer(prev => {
          let anyChange = false;
          const next = prev.map(p => {
            const fresh = docs.find(d => d.id === p.id);
            if (!fresh) return p;
            // Nur übernehmen wenn sich etwas in Appwrite geändert hat
            const changed =
              fresh.weite !== p.weite ||
              fresh.weite2 !== p.weite2 ||
              fresh.fan_votes !== p.fan_votes ||
              fresh.startnummer !== p.startnummer ||
              fresh.name !== p.name ||
              fresh.klasse !== p.klasse;
            if (!changed) return p;
            anyChange = true;
            return { ...p, ...fresh };
          });
          // Neue Teilnehmer aus Appwrite ergänzen
          docs.forEach(fresh => {
            if (!next.find(p => p.id === fresh.id)) {
              next.push(fresh);
              anyChange = true;
            }
          });
          if (!anyChange) return prev; // kein Re-render wenn nichts geändert
          saveLocal(next);
          return next;
        });
      } catch {}
    };
    const interval = setInterval(pollData, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const [showPinModal, setShowPinModal] = useState(false);
  const TABS = (isAdmin && !previewMode) ? ADMIN_TABS : PUBLIC_TABS;
  const [tab, setTab] = useState(isAdmin ? "teilnehmer" : "rangliste");
  const [teilnehmer, setTeilnehmer] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appwriteOk, setAppwriteOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleVote = useCallback(async (t) => {
    const updated = { ...t, fan_votes: (t.fan_votes ?? 0) + 1 };
    setTeilnehmer(prev => {
      const next = prev.map(p => p.id === t.id ? updated : p);
      saveLocal(next);
      return next;
    });
    if (appwriteOk) {
      try { await updateInAppwrite(updated); } catch {}
    }
  }, [appwriteOk]);

  const handleUnvote = useCallback(async (t) => {
    const updated = { ...t, fan_votes: Math.max(0, (t.fan_votes ?? 0) - 1) };
    setTeilnehmer(prev => {
      const next = prev.map(p => p.id === t.id ? updated : p);
      saveLocal(next);
      return next;
    });
    if (appwriteOk) {
      try { await updateInAppwrite(updated); } catch {}
    }
  }, [appwriteOk]);

  const handleDelete = useCallback(async (t) => {
    setTeilnehmer(prev => {
      const next = prev.filter(p => p.id !== t.id);
      saveLocal(next);
      return next;
    });
    if (appwriteOk) {
      try { await databases.deleteDocument(DB_ID, COLLECTION_ID, t.id); } catch {}
    }
  }, [appwriteOk]);

  const handleSetLiveKlasse = async (k) => {
    setLiveKlasse(k);
    await saveLiveState(k, liveTeilnehmerId);
  };

  const handleSetLiveTeilnehmer = async (id) => {
    setLiveTeilnehmerId(id);
    await saveLiveState(liveKlasse, id);
  };

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

  const remaining = useCountdown();
  const eventStarted = remaining <= 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#b1e6a8] text-2xl animate-pulse">Laden...</div>
      </div>
    );
  }

  // Viewer sieht Countdown bis zum Event
  if (!isAdmin && !eventStarted) {
    return (
      <>
        <CountdownScreen onAdminClick={() => setShowPinModal(true)} />
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
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-[#1a1a1a] bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.jpg" alt="Trecker Treck Team Weser" className="h-10 w-auto rounded" />
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
              <>
                <button
                  onClick={() => setShowFahrerdaten(true)}
                  className="px-2 py-1 bg-[#1a1a1a] border border-[#333] text-gray-400 rounded text-xs hover:text-white hover:border-[#b1e6a8] transition-colors"
                >
                  ✏️ Fahrerdaten
                </button>
                <button
                  onClick={() => setPreviewMode(p => !p)}
                  className={`px-2 py-1 border rounded text-xs transition-colors ${previewMode ? "bg-[#b1e6a8] text-black border-[#b1e6a8]" : "bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white"}`}
                  title="Viewer-Ansicht"
                >
                  👁 Preview
                </button>
                <button
                  onClick={() => { sessionStorage.removeItem("ttt_admin"); setIsAdmin(false); setTab("rangliste"); setPreviewMode(false); }}
                  className="px-2 py-1 bg-[#1a1a1a] border border-[#333] text-gray-400 rounded text-xs hover:text-white transition-colors"
                  title="Abmelden"
                >
                  🔓 Abmelden
                </button>
              </>
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
        {tab === "teilnehmer" && isAdmin && !previewMode && (
          <TeilnehmerView
            teilnehmer={teilnehmer}
            onUpdate={handleUpdate}
            appwriteOk={appwriteOk}
            liveKlasse={liveKlasse}
            liveTeilnehmerId={liveTeilnehmerId}
            onSetLiveKlasse={handleSetLiveKlasse}
            onSetLiveTeilnehmer={handleSetLiveTeilnehmer}
          />
        )}
        {showFahrerdaten && (
          <FahrerdatenModal
            teilnehmer={teilnehmer}
            onSave={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setShowFahrerdaten(false)}
          />
        )}
        {tab === "rangliste" && <RanglisteView teilnehmer={teilnehmer} liveKlasse={liveKlasse} />}
        {tab === "fan" && <FanVoting teilnehmer={teilnehmer} onVote={handleVote} onUnvote={handleUnvote} />}
        {tab === "start" && <StartAnzeige teilnehmer={teilnehmer} liveKlasse={liveKlasse} liveTeilnehmerId={liveTeilnehmerId} />}
      </main>
    </div>
  );
}
