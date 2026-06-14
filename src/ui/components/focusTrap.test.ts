import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trapFocusWithin } from "./focusTrap";

const originalGetClientRects = HTMLElement.prototype.getClientRects;

function createKeyboardEvent(key: string, shiftKey = false) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
    shiftKey,
  });
  const preventDefault = vi.spyOn(event, "preventDefault");

  return { event, preventDefault };
}

describe("trapFocusWithin", () => {
  beforeEach(() => {
    HTMLElement.prototype.getClientRects = function getVisibleClientRects() {
      return [{ width: 1, height: 1 }] as unknown as DOMRectList;
    };
  });

  afterEach(() => {
    HTMLElement.prototype.getClientRects = originalGetClientRects;
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("ignores non-Tab keys", () => {
    const container = document.createElement("div");
    const { event, preventDefault } = createKeyboardEvent("Escape");

    trapFocusWithin(event, container);

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("focuses the container when there are no focusable controls", () => {
    const container = document.createElement("div");
    container.tabIndex = -1;
    document.body.append(container);
    const focus = vi.spyOn(container, "focus");
    const { event, preventDefault } = createKeyboardEvent("Tab");

    trapFocusWithin(event, container);

    expect(preventDefault).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
  });

  it("moves focus into the container when focus starts outside", () => {
    const container = document.createElement("div");
    const outside = document.createElement("button");
    const first = document.createElement("button");
    const hidden = document.createElement("button");

    hidden.setAttribute("aria-hidden", "true");
    container.append(first, hidden);
    document.body.append(outside, container);
    outside.focus();
    const { event, preventDefault } = createKeyboardEvent("Tab");

    trapFocusWithin(event, container);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });

  it("wraps backward from the first focusable control", () => {
    const container = document.createElement("div");
    const first = document.createElement("button");
    const last = document.createElement("button");

    container.append(first, last);
    document.body.append(container);
    first.focus();
    const { event, preventDefault } = createKeyboardEvent("Tab", true);

    trapFocusWithin(event, container);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(last);
  });

  it("wraps forward from the last focusable control", () => {
    const container = document.createElement("div");
    const first = document.createElement("button");
    const last = document.createElement("button");

    container.append(first, last);
    document.body.append(container);
    last.focus();
    const { event, preventDefault } = createKeyboardEvent("Tab");

    trapFocusWithin(event, container);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });
});
