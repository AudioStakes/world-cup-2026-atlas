# Production metadata rendering tests

`src/app/App.test.tsx` now protects the production metadata that users see directly in the explorer UI.

It verifies:

- default country result subtitle includes group, FIFA code, and confederation
- Groups & Teams rows render country name plus FIFA/confederation metadata
- match items render match number, stage, kickoff time zone, and venue details
- date result subtitle renders match count, kickoff range, and time-zone summary
- venue result subtitle renders stadium, city, host country, and time zone

This is intentionally an app-level test because these fields are user-facing production data, not just internal view-model details.
