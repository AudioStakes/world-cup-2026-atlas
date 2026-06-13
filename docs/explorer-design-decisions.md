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

The selected or related group/team state should be communicated through stable red border treatments and restrained backgrounds, not extra explanatory text that changes panel height.

## Date selector affordances

The current date should be visually findable without changing layout height. Use the same red outline and light red shadow treatment as the selected country tile. If the current date is also selected, the selected-date fill style takes priority.

On narrow viewports, the Date selector should minimize vertical space. Hide weekday headers, leading blank cells, and visible match-count meta, then render each month as a compact row of day chips. Keeping the calendar aligned by weekday is less important than reducing the amount of screen height consumed before Groups & Teams and the fixture cards.

## Match Time Display

Match time display defaults to each venue's local time because that preserves the official fixture context. The header owns the display-time selector so it affects every visible fixture without being confused with the group/team/date/venue filters.

Country selections use a single primary IANA time zone for that country. When a country is selected, fixture times, date-result kickoff ranges, and visible match-card date headings should all use the selected country's time zone. For example, Japan uses Japan Standard Time (`Asia/Tokyo`, `JST`).

## Detail match cards

Match cards should follow the FIFA-style score and fixture hierarchy:

- date heading
- centered teams, flags, kickoff time or full-time score
- fixture metadata line

The cards should be the primary content in date selections. For a selected Date, the Result panel displays only the tournament fixture timeline. The selected date's first match starts at the top of the scroll container, and surrounding dates remain available above and below by scrolling.

## Group detail panel

A selected Group should show standings first, then date-ordered match cards.

Standings should include visible rank, team code/flag, P, W, D, L, GF, GA, GD, Pts, and Form. Do not show a separate Matches column. Match cards below the table keep the same detail-card treatment used elsewhere.

## Country to group navigation

Country detail headers should make the country group feel actionable. Render the group label as a compact chip/link, and route it through the existing `selectGroup` action so the URL and result panel switch to the group detail view.

## Shadows and panel boundaries

The Date panel should not cast a heavy shadow onto Groups & Teams. Use minimal shadows on stacked explore-panel sections so panel boundaries are clear without darkening the next control area.
