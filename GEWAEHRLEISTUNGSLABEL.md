# EU-Gewährleistungslabel im Recovtec-Theme

Ab **27.09.2026** muss jeder B2C-Shop in der EU die *harmonisierte Mitteilung*
zur gesetzlichen Gewährleistung („Gewährleistungslabel") vor Vertragsschluss
gut sichtbar anzeigen.

Rechtsgrundlage: Richtlinie (EU) 2024/825, konkretisiert durch die
Durchführungsverordnung (EU) 2025/1960.

## Was im Theme bereits fertig ist

| Datei | Zweck |
|---|---|
| `snippets/legal-guarantee-label.liquid` | Rendert Gewährleistungs- und GARAN-Label |
| `sections/main-product.liquid` | Label direkt unter dem Warenkorb-Button |
| `snippets/cart-drawer.liquid` | Label im Warenkorb-Drawer vor „Zur Kasse" |
| `sections/main-cart.liquid` | Label auf der Warenkorbseite |
| `sections/footer.liquid` | Allgemeiner Hinweis auf jeder Seite |
| `config/settings_schema.json` | Einstellungsgruppe „Gewährleistungslabel (EU-Pflicht)" |
| `assets/theme.css` | Styles (`.lgl*`) |
| `assets/theme.js` | Klick auf das Label öffnet es in Originalgröße |

Solange keine Grafik hinterlegt ist, erscheint im Live-Shop **nichts**. Im
Theme-Editor erscheint stattdessen ein gelber Hinweiskasten.

## Was noch manuell zu tun ist

1. **Offizielle Grafik herunterladen.** Die Datei stammt von der
   EU-Kommission (Portal „Ihr Europa" → *Gewährleistungslabel und
   GARAN-Label*). Benötigt wird die **deutsche Sprachfassung in der farbigen
   Version** — im Onlinehandel ist die Farbfassung Pflicht.
   Keine Nachbauten oder Kopien von Drittanbieter-Seiten verwenden.
2. **Hochladen:** Shopify-Adminbereich → *Onlineshop → Themes → Anpassen →
   Theme-Einstellungen → Gewährleistungslabel (EU-Pflicht)*.
   - PNG über „Label-Grafik" auswählen, **oder**
   - die SVG-Datei in den Theme-Ordner `assets/` legen und ihren Dateinamen
     in das Feld „Alternativ: Dateiname im Theme-Ordner assets" eintragen.
3. **Breite und Platzierung** in derselben Einstellungsgruppe prüfen.
4. Optional eine eigene Shop-Seite zur Gewährleistung anlegen und im Feld
   „Link Mehr erfahren" verknüpfen. Der QR-Code auf dem Label lässt sich am
   Desktop nicht scannen — ein Link hilft.

## GARAN-Label

Das zweite Label (gewerbliche Haltbarkeitsgarantie) ist standardmäßig **aus**.
Es darf nur verwendet werden, wenn der Hersteller für das Produkt eine
kostenlose Haltbarkeitsgarantie von **mehr als zwei Jahren** gewährt. Eine
einjährige Herstellergarantie reicht dafür nicht.

## Darstellung

Die amtliche Grafik ist ein textdichtes Hochformat im DIN-A4-Verhältnis, kein
kleines Siegel. In Shopgröße (300 px auf der Produktseite) ist der Kleintext
nicht lesbar. Ein Klick öffnet das Label deshalb in Originalgröße. Beides ist
über die Theme-Einstellungen anpassbar.

## Grenzen

- Die Grafik ist rechtlich unveränderlich: Wortlaut, Farben, Proportionen und
  QR-Code dürfen nicht angepasst werden. Das Theme skaliert sie nur.
- Der Shopify-**Checkout** lässt sich über ein Theme nicht bearbeiten. Das
  Label sitzt deshalb auf Produktseite und Warenkorb, also vor der Kasse.
- Dieses Dokument ist eine Umsetzungsnotiz, keine Rechtsberatung.
