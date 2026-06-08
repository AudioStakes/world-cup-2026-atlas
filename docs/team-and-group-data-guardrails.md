# Team and group data guardrails

`src/data/teamAndGroupData.test.ts` protects the production-facing team and draw-position dataset.

It verifies:

- exactly 48 countries
- exactly 48 assigned group slots
- no unassigned visible group slots
- stable Group A-L draw positions
- every country appears in exactly one slot
- FIFA codes are present, uppercase, and unique
- display labels are not blank / placeholder / TBD
- host countries are present in the team set
- Japan remains Group F slot 2
- country and slot records keep `sourceNote: "fifa-world-cup-26-groups"`

This test is intentionally strict because the group composition is a foundational dataset for the explorer.
