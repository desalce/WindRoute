# Projektdokumentation - WindRoute: Windoptimierte Trainingsrouten für Ausdauersportler

## Inhaltsverzeichnis

1. [Ausgangslage](#1-ausgangslage)
2. [Lösungsidee](#2-lösungsidee)
3. [Vorgehen & Artefakte](#3-vorgehen--artefakte)
    1. [Understand & Define](#31-understand--define)
    2. [Sketch](#32-sketch)
    3. [Decide](#33-decide)
    4. [Prototype](#34-prototype)
    5. [Validate](#35-validate)
4. [Erweiterungen [Optional]](#4-erweiterungen-optional)
5. [Projektorganisation [Optional]](#5-projektorganisation-optional)
6. [KI-Deklaration](#6-ki-deklaration)
7. [Anhang [Optional]](#7-anhang-optional)

> **Hinweis:** Massgeblich sind die im **Unterricht** und auf **Moodle** kommunizierten Anforderungen.

<!-- WICHTIG: DIE KAPITELSTRUKTUR DARF NICHT VERÄNDERT WERDEN! -->

## 1. Ausgangslage

- **Problem:** Ausdauersportler:innen (Rennrad/Gravel) müssen vor jedem Training eine Route wählen. Dabei treten im Alltag drei Reibungspunkte auf:
  1. **Entscheidungsmüdigkeit** — bei jeder Ausfahrt muss neu entschieden werden, wohin es geht.
  2. **Zu viele Optionen** — Apps wie Komoot, Strava oder Ride with GPS bieten unzählige Routenvorschläge, aber keine kontextsensitive Auswahl für den heutigen Tag.
  3. **Wind als übersehener Faktor** — der Wind ist neben Steigungen der grösste Einflussfaktor auf Anstrengung und Trainingserlebnis, wird aber in den meisten Routenplaner-Apps bei der Empfehlung nicht automatisch berücksichtigt.
  
  Die in der Cycling-Community weit verbreitete Faustregel lautet: *"Starte gegen den Wind, komm mit dem Wind nach Hause"*. Aktuell muss diese Planung manuell erfolgen (Wetter-App öffnen, Windrichtung prüfen, Route selbst entsprechend legen).

- **Ziele:**
  - Automatische Generierung von 1–2 passenden Trainingsrouten pro Tag basierend auf aktueller Windvorhersage
  - "Gegenwind zuerst, Rückenwind zurück"-Logik als Kernprinzip
  - Reduktion kognitiver Belastung: ein Klick statt manueller Planung
  - Unterstützung für Rennrad- und Gravel-Fahrer:innen

- **Primäre Zielgruppe:** Hobby- und ambitionierte Hobby-Ausdauersportler:innen (Rennrad/Gravel), die regelmässig (1–5× pro Woche) trainieren und schnell eine sinnvolle Trainingsroute ab einem festen Startpunkt (meist zu Hause) brauchen.

- **Weitere Stakeholder [Optional]:** Trainer:innen, die Trainingspläne gestalten; Radsportvereine; perspektivisch auch Läufer:innen als zweite Zielgruppe.

## 2. Lösungsidee

Eine Web-App (**WindRoute**), die dem/der Sportler:in zu Beginn eines Trainingstages automatisch 1–2 Streckenvorschläge ab einem gewählten Startpunkt macht — wobei der erste Teil der Route gegen den Wind und der zweite Teil mit dem Wind verläuft.

- **Kernfunktionalität:**
  1. Nutzer:in gibt Startpunkt, gewünschte Distanz (z.B. 40 km) und Sportart (Rennrad/Gravel) ein
  2. App ruft die aktuelle Windrichtung & -stärke für den Standort ab (Open-Meteo API)
  3. App generiert via Routing-API (GraphHopper `round_trip` mit `heading`-Parameter) 1–2 Rundkurse, die in Windrichtung starten
  4. Routen werden auf einer Karte angezeigt inkl. Farbcodierung (Gegenwind rot, Rückenwind grün) und Export als GPX für den Radcomputer

- **Annahmen [Optional]:**
  - Nutzer:innen finden die Routenvorschläge nützlicher als eine manuelle Suche
  - Die GraphHopper `round_trip`-Funktion liefert Routen in fahrbarer Qualität
  - Der "Gegenwind-zuerst"-Ansatz wird als positiv empfunden (nicht alle Nutzer:innen bevorzugen das)
  - Eine Web-App reicht als erste Lösung; eine native Mobile-App ist nicht zwingend nötig

- **Abgrenzung [Optional]:**
  - **Nicht** im Umfang: Trainingsplanung (Intervalle, Wattvorgaben), Social Features, Navigation während der Fahrt, Tracking/Aufzeichnung der Fahrt, Mehrtages-Touren
  - **Nicht** im Umfang: Berücksichtigung von Steigungen, Strassenbelag-Qualität oder Verkehr (bleiben für eine spätere Iteration)

## 3. Vorgehen & Artefakte

### 3.1 Understand & Define

#### Zielgruppenverständnis

**Problemraumanalyse**

| Nutzer | Bedürfnisse | Kontext / Herausforderungen | HMW |
|---|---|---|---|
| Ausdauersportler:innen (Rennrad/Gravel), die eine Trainingsstrecke brauchen | 1–2 Vorschläge an Trainingsrouten für den heutigen Tag, bei denen zuerst gegen den Wind und danach mit dem Wind gefahren wird | - nicht jedes Mal selbst entscheiden müssen<br>- zu viele verschiedene Möglichkeiten<br>- Training muss oft einfach und schnell planbar sein<br>- Wind wird in Planer-Apps heute kaum automatisch berücksichtigt | - Wie können wir Sportler:innen helfen, damit sie nicht jedes Mal selbst entscheiden müssen, wohin sie fahren?<br>- Wie können wir für spezifische Trainingseinheiten geeignete Routen vorschlagen?<br>- Wie können wir Routen so planen, dass sie je nach Wetter optimal genutzt werden können? |

**Proto-Persona (Entwurf):** Jonas, 32, arbeitet im Büro, besitzt ein Rennrad und Gravelbike, fährt 3× pro Woche ab zu Hause los (meist 1–2 h). Will schnell losfahren und nicht 15 Minuten mit Routenplanung verbringen.

#### Wesentliche Erkenntnisse aus der Recherche

**a) Die "Gegenwind-zuerst"-Strategie ist in der Cycling-Community fest etabliert:**
- Mehrere unabhängige Fachquellen (BikeRadar, Roadman Cycling, RoadBikeRider, TrainRight, Cyclist) bestätigen: Starte bei einer Out-and-Back-Route frisch in den Wind und komm mit Rückenwind zurück. Das ist physisch und psychologisch vorteilhaft.
- Beleg: Roadman Cycling formuliert diese Regel als expliziten Strategietipp für Rennradfahrer.
- Quelle: https://roadmancycling.com/blog/cycling-headwind-strategies

**b) Bestehende Apps analysieren Wind, schlagen aber keine Routen vor:**

| App | Funktion | Lücke |
|---|---|---|
| **myWindsock** (Web, £19.99/Jahr) | Zeigt Gegen-/Rückenwind-Anteile auf einer vom User geplanten Route | Keine Routengenerierung; kostenpflichtig |
| **Headwind App** (kostenlos, via Strava) | Farbliche Visualisierung von Wind entlang bestehender Routen | Nur Analyse existierender Routen |
| **Epic Ride Weather** (Abo) | Hyperlokale Vorhersage alle 10 Minuten entlang der Route | Route muss bereits existieren |
| **Bikemap** | Wind-Overlay auf Karten, 10-Tage-Wind-Vorhersage | Automatische Rundtouren, aber nicht windoptimiert |
| **Komoot / Strava / Ride with GPS** | Standard-Routenplanung | Keine Windlogik in der Empfehlung |

➡ **Marktlücke:** Alle gefundenen Tools arbeiten **reaktiv** (User plant Route → App zeigt Wind). Kein Tool arbeitet **proaktiv** im Sinne von "heute ist Wind aus West, also bekommst du diese Rundroute". Das ist der Differenzierungspunkt für WindRoute.

**c) Es gibt direkte Nutzeräusserungen, die diesen Bedarf bestätigen:**
- In der Diskussion zur Headwind App wurde genau diese Idee explizit als Wunsch geäussert: ein Feature, das automatisch bewertet/auswählt, welche Route bei den heutigen Windbedingungen am sinnvollsten wäre.
- Quelle: https://road.cc/content/tech-news/free-headwind-app-provides-visualisation-wind-conditions-273403

**d) Technische Machbarkeit ist für einen Prototyp gegeben:**

| Zweck | API / Tool | Besonderheit |
|---|---|---|
| **Wind- & Wetterdaten** | [Open-Meteo](https://open-meteo.com/) | Kostenlos, kein API-Key, kein Registrierung, liefert stündliche Windrichtung & -geschwindigkeit (`wind_direction_10m`, `wind_speed_10m`) |
| **Routing (Rundfahrten)** | [GraphHopper Directions API](https://docs.graphhopper.com/openapi/routing) | Bietet `algorithm=round_trip` mit `heading`-Parameter (0–360°) — d.h. man kann die Startrichtung (= Windrichtung) direkt vorgeben. Genau passend für unsere Logik. |
| **Alternative Routing-APIs** | OpenRouteService, OSRM, Valhalla | Alle kostenlos, profilspezifisch (Rennrad, Gravel/MTB) |
| **Karten-Rendering** | Leaflet / MapLibre | Open Source, gut in SvelteKit integrierbar |

**Kern-Insight für die Umsetzung:** Die Kombination `Open-Meteo (Windrichtung)` + `GraphHopper round_trip (heading = Windrichtung)` erlaubt die Kernfunktion mit minimalem Aufwand. Das ist die technische Grundhypothese, die im Prototyp validiert wird.

### 3.2 Sketch
- **Variantenüberblick:** _[folgt in Woche 9]_
- **Skizzen:** _[folgt in Woche 9]_

### 3.3 Decide
- **Gewählte Variante & Begründung:** _[folgt]_
- **End-to-End-Ablauf:** _[folgt]_
- **Mockup:** _[folgt in Woche 10]_

### 3.4 Prototype

#### 3.4.1. Entwurf (Design)
_[folgt]_

#### 3.4.2. Umsetzung (Technik)
_[folgt ab Woche 11]_

### 3.5 Validate
_[folgt in Woche 14]_

## 4. Erweiterungen [Optional]
_[folgt]_

## 5. Projektorganisation [Optional]
_[folgt]_

## 6. KI-Deklaration

### 6.1 KI-Tools
- **Eingesetzte Tools:** Claude (Anthropic) — für die Recherche zur Ausgangslage (existierende Apps, APIs, Fachquellen zu Headwind-Strategien).
- **Zweck & Umfang:** Unterstützung bei der strukturierten Web-Recherche, Zusammenfassung von Quellen und Einordnung der Marktlücke. Die HMW-Fragen und die Problemraumanalyse stammen aus dem Unterricht und eigener Überlegung.
- **Eigene Leistung (Abgrenzung):** Themenwahl, Problemraumanalyse, HMW-Fragen, Bewertung und Auswahl der Rechercheergebnisse, redaktionelle Überarbeitung.

### 6.2 Prompt-Vorgehen
_[folgt / wird laufend ergänzt]_

### 6.3 Reflexion
_[folgt / wird laufend ergänzt]_

## 7. Anhang [Optional]

**Verwendete Quellen für die Recherche (Abschnitt 3.1):**

- Roadman Cycling — *Cycling Headwind Strategies*: https://roadmancycling.com/blog/cycling-headwind-strategies
- BikeRadar — *Cycling in the wind: 10 pro tips*: https://www.bikeradar.com/features/how-to-ride-into-a-headwind
- RoadBikeRider — *Ultimate Guide to Cycling in Wind*: https://www.roadbikerider.com/ultimate-guide-cycling-wind/
- road.cc — *Free Headwind app provides visualisation of wind conditions*: https://road.cc/content/tech-news/free-headwind-app-provides-visualisation-wind-conditions-273403
- myWindsock: https://mywindsock.com/
- Headwind App: https://headwindapp.com/
- Epic Ride Weather: https://www.epicrideweather.com/
- Bikemap: https://www.bikemap.net/
- Open-Meteo API: https://open-meteo.com/
- GraphHopper Routing API (round_trip): https://docs.graphhopper.com/openapi/routing
- OpenStreetMap Routing-Wiki (Router-Übersicht): https://wiki.openstreetmap.org/wiki/Routing/online_routers
