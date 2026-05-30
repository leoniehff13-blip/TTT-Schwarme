# Appwrite Setup

In der Appwrite Console folgendes anlegen:

## 1. Datenbank erstellen
- ID: `ttt`
- Name: TTT Schwarme

## 2. Collection erstellen
- Database ID: `ttt`
- Collection ID: `teilnehmer`
- Name: Teilnehmer

## 3. Attribute der Collection

| Attribut    | Typ     | Required |
|-------------|---------|----------|
| klasse      | String  | ✓        |
| zahlung     | Boolean | ✓        |
| name        | String  | ✓        |
| mail        | String  |          |
| nummer      | String  |          |
| adresse     | String  |          |
| kennzeichen | String  |          |
| modell_nr   | String  |          |
| hersteller  | String  |          |
| baujahr     | String  |          |
| ps          | String  |          |
| weite       | Float   |          |
| weite2      | Float   |          |
| anmerkungen | String  |          |
| startnummer | String  |          |

## 4. Permissions
Collection auf "Any" lesen/schreiben setzen (oder Authentifizierung einrichten)

## 5. App starten
```
npm run dev
```

Beim ersten Start: Daten sind lokal gespeichert.
Auf "→ Appwrite importieren" klicken, um alle 98 Teilnehmer in Appwrite hochzuladen.
