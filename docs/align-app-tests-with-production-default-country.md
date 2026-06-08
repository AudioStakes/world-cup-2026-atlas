# Align app rendering tests with production default country

The production group data changed the default fallback country.

Current production draw:

```txt
Group A slot 1 = Mexico
Group F slot 2 = Japan
```

Therefore the app's default explorer state should render:

```txt
Mexico
Group A · MEX · CONCACAF
/?country=mex
```

The previous rendering test still expected Japan as the default country, which matched older seed data but not the production draw.

This patch updates `src/app/App.test.tsx` so that:

- the default render expects Mexico
- clicking Japan asserts Japan becomes selected
- Japan-specific match item metadata is checked after selecting Japan
- isolated Date and Venue result tests continue to clear the default selection first
