# Avoid brittle Japan match-number assertions in App tests

This patch removes the app-level assumption that Japan's first rendered result must include a specific match number such as `Match 11`.

Why:

- fixture identity and fixture ordering are already protected by data and view-model tests
- App tests should focus on user-facing rendering coverage
- during production data migration, hardcoding a specific match number in an app rendering test is brittle

The updated App test verifies that a country result match card renders:

- match number
- group/stage label
- date
- opponent text
- kickoff time with time zone
- venue detail text

without tying that rendering test to one specific Japan fixture number.
