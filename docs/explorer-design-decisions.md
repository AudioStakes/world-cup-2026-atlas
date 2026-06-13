# Explorer design decisions

This document records durable UI decisions for the World Cup 2026 Atlas explorer.

## Stable panel layout

Do not render conditional helper copy above the Date or Groups & Teams controls.

Removed copy:

- `Dimmed dates do not include the current selection.`
- `Dimmed teams do not include the current selection.`

Reason: the helper text appears only for some selections, which shifts the Date and Groups & Teams content vertically. That movement makes repeated filtering feel unstable. Dimmed state remains visible on the affected controls; the explanatory copy is intentionally omitted.

## Groups & Teams density

The Groups & Teams panel should use the available panel area instead of compressing all teams into tiny inline text. On tall desktop layouts, group rows can be larger and more legible. Shorter desktop and mobile layouts may stay compact when that is needed to keep all 48 flags visible.

When narrow viewports stack the controls and result panels vertically, the Groups & Teams panel should minimize height so fixture cards stay close to the top of the screen. Hide country codes in that mode, keep every flag visible, and arrange groups across two to four columns depending on available width.

The selected or related group/team state should be communicated through stable red border treatments and restrained backgrounds, not extra explanatory text that changes panel height.

The panel uses top-level `Group` and `Tournament` tabs. Do not render a separate visible
`Groups & Teams` title above those tabs; the selected tab already explains the panel content and
the extra heading consumes vertical space. The initial tournament view can be a compact round-by-round
knockout list before investing in a more elaborate bracket layout.

## Date selector affordances

The current date should be visually findable without changing layout height. Use the same red outline and light red shadow treatment as the selected country tile. If the current date is also selected, the selected-date fill style takes priority.

On narrow viewports, the Date selector should minimize vertical space. Hide weekday headers, leading blank cells, and visible match-count meta, then render each month as a compact row of day chips. Keeping the calendar aligned by weekday is less important than reducing the amount of screen height consumed before Groups & Teams and the fixture cards.

## Match Time Display

Match time display defaults to the visitor's browser local time zone when it can be detected. That makes the first view match the access location without requiring the user to choose a country manually. If browser time-zone detection is unavailable, fall back to each venue's local time because that preserves the official fixture context. The header owns the display-time selector so it affects every visible fixture without being confused with the group/team/date/venue filters.

Country selections use a single primary IANA time zone for that country. When a country is selected, fixture times, date-result kickoff ranges, and visible match-card date headings should all use the selected country's time zone. For example, Japan uses Japan Standard Time (`Asia/Tokyo`, `JST`).

## Detail match cards

Match cards should follow the FIFA-style score and fixture hierarchy:

- date heading
- centered teams, flags, kickoff time or full-time score
- fixture metadata line

The cards should be the primary content in date selections. For a selected Date, the Result panel displays only the tournament fixture timeline. The selected date's first match starts at the top of the scroll container, and surrounding dates remain available above and below by scrolling.

Do not make the entire match card clickable or give the full card a clickable hover treatment. A card contains several possible navigation targets, so only the explicit country, group, and venue controls inside the card should be interactive. Country controls select that country, group controls select that group, and venue controls select that venue.

On narrow cards, keep the score row to one line. If there is not enough inline space for team names, hide the names visually before allowing the row to stack; the flags and kickoff/full-time value must remain visible.

Runtime match results should appear through the same match-card layout. Show the provider short
status label, such as `FT` or `1H`, only after `queryExplorer()` has normalized it into the
ViewModel. UI components should not know API-FOOTBALL response shapes or fetch provider data.

## Group detail panel

A selected Group should show standings first, then date-ordered match cards.

Standings should include visible rank, team code/flag, P, W, D, L, GF, GA, GD, Pts, and Form. Do not show a separate Matches column. Match cards below the table keep the same detail-card treatment used elsewhere.

Do not render a separate group result header above the standings table. The standings caption already identifies the group, and the redundant summary consumes vertical space before the primary table content.

## Country to group navigation

Country detail headers should make the country group feel actionable. Render the group label as a compact chip/link, and route it through the existing `selectGroup` action so the URL and result panel switch to the group detail view.

## Shadows and panel boundaries

The Date panel should not cast a heavy shadow onto Groups & Teams. Use minimal shadows on stacked explore-panel sections so panel boundaries are clear without darkening the next control area.
