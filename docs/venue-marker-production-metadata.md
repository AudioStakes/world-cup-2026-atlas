# Venue metadata on map markers

Map venue markers now carry production venue metadata in addition to compact visual labels.

Each marker includes:

- stadium name
- city and host country
- time-zone abbreviation
- tooltip label
- accessible aria label

Example:

```txt
title="Dallas — AT&T Stadium, Arlington, USA · CT"
aria-label="Select venue Dallas, AT&T Stadium, Arlington, USA, CT"
```

The compact visual marker label remains separate:

```txt
New York
SF Bay
```

This keeps the map readable while making the venue data reviewable and accessible.
