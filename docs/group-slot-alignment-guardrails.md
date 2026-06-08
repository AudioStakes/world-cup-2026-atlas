# Group slot alignment guardrails

`src/data/groupSlotAlignment.test.ts` freezes the visible group table order.

It checks the exact FIFA code sequence for each group:

```txt
A: MEX, RSA, KOR, CZE
B: CAN, BIH, QAT, SUI
C: BRA, MAR, HAI, SCO
D: USA, PAR, AUS, TUR
E: GER, CUW, CIV, ECU
F: NED, JPN, SWE, TUN
G: BEL, EGY, IRN, NZL
H: ESP, CPV, KSA, URU
I: FRA, SEN, IRQ, NOR
J: ARG, ALG, AUT, JOR
K: POR, COD, UZB, COL
L: ENG, CRO, GHA, PAN
```

This test is intentionally stricter than the general data integrity tests.

Use it to catch accidental group-table regressions while fixture data is added group by group.

The records still remain `provisional` until the group composition and draw positions are verified against an official FIFA source captured in `src/data/dataSources.ts`.
