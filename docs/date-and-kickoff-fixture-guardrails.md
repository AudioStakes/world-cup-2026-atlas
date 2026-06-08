# Date and kickoff fixture guardrails

`src/data/dateAndKickoffFixtureCoverage.test.ts` protects date and local kickoff data for the full 104-match schedule.

It verifies:

- tournament date range: 2026-06-11 to 2026-07-19
- active match dates and daily match counts
- every match number's date, local kickoff time, and venue
- kickoff time format as `HH:mm`
- group-stage closing dates at six matches each
- knockout opening date
- semi-final dates, kickoff times, and venues
- third-place and final weekend dates, kickoff times, and venues
- date-level match order by match number

This test intentionally includes kickoff times because the date selector and result card both depend on the date/time schedule being production-grade.
