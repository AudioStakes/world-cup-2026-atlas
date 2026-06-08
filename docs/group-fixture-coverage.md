# Group fixture coverage guardrails

Groups A and F are the first production-aligned fixture subsets in the repository.

The test file below keeps those groups from accidentally regressing while the rest of the dataset is migrated:

```txt
src/data/groupFixtureCoverage.test.ts
```

It verifies:

- each complete group has four slots
- each complete group has six matches
- every match references two different slots from that group
- each round-robin slot pair appears exactly once
- Japan's Group F route remains Match 11, Match 36, Match 57

When another group is migrated to a complete six-match subset, add its group code to:

```ts
const completeFixtureGroupCodes = ["A", "F"] as const;
```

Do not add a group to this list until all six of its group-stage fixtures have been imported and checked.
