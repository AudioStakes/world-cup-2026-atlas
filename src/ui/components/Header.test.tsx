import { fireEvent, render, screen } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { countryId } from "../../domain/ids";
import {
  browserLocalDisplayTimeZoneId,
  venueLocalDisplayTimeZoneId,
} from "../../features/explorer/displayTimeZone";
import type { ExplorerHeaderViewModel } from "../../features/explorer/types";
import { Header } from "./Header";

const header: ExplorerHeaderViewModel = {
  title: "World Cup 2026 Atlas",
  subtitle: "Explore teams, venues, dates, and routes across North America.",
  timeZoneSelector: {
    label: "Match times",
    selectedValue: venueLocalDisplayTimeZoneId,
    options: [
      {
        value: venueLocalDisplayTimeZoneId,
        label: "Venue local",
        detailLabel: "Use each stadium's local time",
      },
      {
        value: browserLocalDisplayTimeZoneId,
        label: "Your local time",
        detailLabel: "JST · Asia/Tokyo",
      },
      {
        value: countryId("jpn"),
        label: "🇯🇵 Japan",
        detailLabel: "JST",
      },
    ],
  },
  statusItems: [
    { key: "selectedTimeZone", label: "Venue local" },
    { key: "dataSource", label: "Official/trusted sources · direct distances derived" },
  ],
};

describe("Header", () => {
  it("narrows select values to timezone option ids before notifying callers", () => {
    const onTimeZoneChange = vi.fn();

    render(<Header header={header} onTimeZoneChange={onTimeZoneChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Match times" }), {
      target: { value: "jpn" },
    });

    expect(onTimeZoneChange).toHaveBeenCalledWith(countryId("jpn"));
  });

  it("ignores raw select values that do not match a timezone option", () => {
    const onTimeZoneChange = vi.fn();

    render(<Header header={header} onTimeZoneChange={onTimeZoneChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Match times" }), {
      target: { value: "missing-time-zone" },
    });

    expect(onTimeZoneChange).not.toHaveBeenCalled();
  });
});
