# Wie Änderungen am Shop ablaufen

## Die drei Themes

| Theme | Branch | Wofür |
|---|---|---|
| **Recovtec Live** | `claude/recovtec-live` | Das echte Schaufenster. Wird nie direkt bearbeitet. |
| **Recovtec Entwurf** | `staging` | Hier landet jede Änderung zuerst. Nicht veröffentlicht, nur per Vorschau sichtbar. |
| **Backup TT.MM.JJJJ** | — | Eingefrorene Kopie des letzten funktionierenden Stands. Ohne GitHub-Verbindung. |

## Der Ablauf

```
Claude arbeitet auf einem Feature-Branch
        │
        ▼  Pull Request
    staging  ──►  Entwurfs-Theme in Shopify  ──►  du schaust es dir an
        │
        ▼  Pull Request (erst wenn es passt)
claude/recovtec-live  ──►  Live-Theme  ──►  öffentlich
```

Aus einem Merge werden zwei. Dafür siehst du jede Änderung, bevor ein Kunde sie sieht.

## Die eine Regel

**Einstellungen und Inhalte im Theme-Editor nur im Entwurfs-Theme ändern — nie im Live-Theme.**

Shopify schreibt jede Änderung aus dem Theme-Editor in den verbundenen Branch zurück
(`config/settings_data.json`, `templates/*.json`). Wird an beiden Themes gearbeitet,
laufen die Branches auseinander und jeder Merge wird zur Konfliktauflösung.

Ist es doch einmal passiert: Bescheid sagen, dann wird der Live-Stand zurück in
`staging` geholt, bevor es weitergeht.

## Notfall: zurück zum letzten funktionierenden Stand

1. Shopify-Admin → **Onlineshop → Themes**
2. Beim Backup-Theme auf **Veröffentlichen**

Dauert ein paar Sekunden. Der Shop ist wieder so, wie er beim Anlegen des Backups war.

Danach Bescheid sagen — der Code-Stand in GitHub muss dann nachgezogen werden,
sonst überschreibt der nächste Merge den Rückfall wieder.

## Neues Backup anlegen

Sinnvoll vor jeder größeren Änderung und nach jedem gelungenen Live-Gang:

1. **Onlineshop → Themes**
2. Beim Live-Theme auf **…** → **Duplizieren**
3. Duplikat umbenennen: `Backup JJJJ-MM-TT`
4. Ältere Backups löschen — Shopify erlaubt begrenzt viele Themes

Wichtig: Das Duplikat ist **nicht** mit GitHub verbunden. Genau so soll es sein —
sonst würde es beim nächsten Merge mit überschrieben.

## Was ein Backup nicht abdeckt

Ein Theme ist nur das Design. Nicht enthalten sind:

- Produkte, Preise, Bilder, Lagerbestand
- Bestellungen und Kunden
- Apps, Zahlungsarten, Versandeinstellungen

Die liegen im Shop selbst und sind bei allen Themes dieselben. Ein Backup schützt
vor kaputtem Design, nicht vor gelöschten Produkten.
