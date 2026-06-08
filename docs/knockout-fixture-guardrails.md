# Knockout fixture guardrails

`src/data/knockoutFixtureCoverage.test.ts` protects the knockout bracket data after Match 73-104 were imported.

It verifies:

- Round of 32 count: 16
- Round of 16 count: 8
- Quarter-final count: 4
- Semi-final count: 2
- Third-place match count: 1
- Final count: 1
- key Round of 32 bracket entry participants
- key winner-path links for Match 89, 97, and 101
- third-place match uses losers of Match 101 and Match 102
- final uses winners of Match 101 and Match 102
- every `matchWinner` / `matchLoser` reference points to an earlier known match
- knockout matches do not pretend to have concrete country participants before results are known

This is intentionally a structural guardrail. It does not decide which teams advance.
