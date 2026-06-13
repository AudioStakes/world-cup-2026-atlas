# Venue marker label placement

Venue markers are anchored by projected venue `geoPoint` positions. Labels are positioned separately
for readability.

- Projected coordinates place the venue dot.
- Label layout offsets handle readability.

## Rules

1. Do not change venue coordinates just to move a label.
2. Prefer moving labels away from dense areas rather than hiding labels.
3. Keep the dot clickable even when the label is offset.

East Coast labels intentionally extend left and use vertical offsets because Boston, New York / New Jersey, and Philadelphia are close together.
