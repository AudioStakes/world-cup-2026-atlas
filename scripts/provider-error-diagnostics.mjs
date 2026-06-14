export function summarizeProviderErrorText(text) {
  try {
    const parsed = JSON.parse(text);

    if (!isRecord(parsed)) {
      return {
        status: "invalid",
        at: "-",
        message: "-",
        details: null,
      };
    }

    return {
      status: "present",
      at: typeof parsed.at === "string" ? parsed.at : "-",
      message: typeof parsed.message === "string" ? parsed.message : "-",
      details: summarizeProviderErrorDetails(parsed.details),
    };
  } catch {
    return {
      status: "invalid-json",
      at: "-",
      message: "-",
      details: null,
    };
  }
}

export function summarizeProviderErrorDetails(details) {
  if (!isRecord(details)) {
    return null;
  }

  const request = isRecord(details.request)
    ? {
        league: getString(details.request.league),
        season: getString(details.request.season),
        date: getString(details.request.date),
        timezone: getString(details.request.timezone),
      }
    : null;

  return {
    kind: getString(details.kind),
    errorType: getString(details.errorType),
    errorKeys: getStringArray(details.errorKeys),
    errorMessages: getStringArray(details.errorMessages),
    responseCount: getFiniteNumber(details.responseCount),
    httpStatus: getFiniteNumber(details.httpStatus),
    request,
  };
}

export function formatProviderErrorDetailsLines(details, prefix = "Provider error details") {
  const summary = summarizeProviderErrorDetails(details);

  if (!summary) {
    return [];
  }

  const lines = [];

  if (summary.kind) {
    lines.push(`${prefix} kind: ${summary.kind}`);
  }

  if (summary.errorType) {
    lines.push(`${prefix} errorType: ${summary.errorType}`);
  }

  if (summary.errorKeys.length > 0) {
    lines.push(`${prefix} errorKeys: ${summary.errorKeys.join(", ")}`);
  }

  if (summary.errorMessages.length > 0) {
    lines.push(`${prefix} messages: ${summary.errorMessages.join(" | ")}`);
  }

  if (summary.responseCount !== null) {
    lines.push(`${prefix} responseCount: ${summary.responseCount}`);
  }

  if (summary.httpStatus !== null) {
    lines.push(`${prefix} httpStatus: ${summary.httpStatus}`);
  }

  const requestFields = summary.request
    ? [
        ["league", summary.request.league],
        ["season", summary.request.season],
        ["date", summary.request.date],
        ["timezone", summary.request.timezone],
      ].filter((field) => field[1])
    : [];

  if (requestFields.length > 0) {
    lines.push(
      `${prefix} request: ${requestFields.map(([key, value]) => `${key}=${value}`).join(", ")}`,
    );
  }

  return lines;
}

function getString(value) {
  return typeof value === "string" && isSafeDisplayString(value) ? value : null;
}

function getStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === "string" && isSafeDisplayString(item)).slice(0, 8);
}

function getFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isSafeDisplayString(value) {
  return !/x-apisports-key|authorization|bearer\s+|token|secret|password|credential/i.test(value);
}

function isRecord(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
