const IMPORTANT_LINE_PATTERNS = [
  /Completion report instruction:/,
  /Review Notes:/,
  /残作業:/,
  /error TS\d+/,
  /Biome checked \d+ files/,
  /Playwright/,
  /pnpm .*failed/i,
  /ERR_PNPM_/,
  /Command failed/i,
  /Timed out/i,
  /timeout/i,
];

export function parseStopHookToggleValue(rawValue, name = "STOP_HOOK") {
  if (rawValue === undefined) {
    return { enabled: true };
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized.length === 0) {
    return { enabled: true };
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return { enabled: true };
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return { enabled: false };
  }

  return {
    enabled: true,
    warning: `warning: invalid ${name}=${JSON.stringify(rawValue)}; using on`,
  };
}

export function getInputStrings(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => getInputStrings(item));
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap((item) => getInputStrings(item));
  }

  return [];
}

export function isFinalReportResponse(value) {
  return getInputStrings(value).some((text) =>
    /Completion report instruction:|Review Notes:|残作業:/.test(text),
  );
}

export function formatHookJson(value) {
  return `${JSON.stringify(value)}\n`;
}

export function buildBlockResponse(title, reason) {
  return {
    decision: "block",
    reason: [title, "", reason].filter(Boolean).join("\n"),
  };
}

export function buildFinalResponseReason({
  prReportLine,
  completionPrompt,
  instructionFeedbackPrompt,
}) {
  const lines = [
    "Report data:",
    prReportLine,
    "",
    "Completion report instruction:",
    completionPrompt,
  ];

  if (instructionFeedbackPrompt !== undefined) {
    lines.push("", "Instruction feedback prompt:", instructionFeedbackPrompt);
  }

  return lines.filter(Boolean).join("\n");
}

export function parseStatusPaths(statusOutput) {
  return statusOutput
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const path = line.slice(3).trim();
      const renameSeparator = path.indexOf(" -> ");
      return renameSeparator >= 0 ? path.slice(renameSeparator + 4) : path;
    });
}

export function compactOutput(
  output,
  {
    contextRadius = 4,
    tailLines = 24,
    maxLinesTotal = 96,
    importantLinePatterns = IMPORTANT_LINE_PATTERNS,
  } = {},
) {
  const lines = output.split(/\r?\n/);
  if (lines.length <= maxLinesTotal) {
    return output.trimEnd();
  }

  const selectedIndexes = new Set();
  const importantIndexes = lines
    .map((line, index) =>
      importantLinePatterns.some((pattern) => pattern.test(line)) ? index : -1,
    )
    .filter((index) => index >= 0);

  for (const index of importantIndexes) {
    const start = Math.max(0, index - contextRadius);
    const end = Math.min(lines.length, index + contextRadius + 1);
    for (let cursor = start; cursor < end; cursor += 1) {
      selectedIndexes.add(cursor);
    }
  }

  const tailStart = Math.max(0, lines.length - tailLines);
  for (let index = tailStart; index < lines.length; index += 1) {
    selectedIndexes.add(index);
  }

  const selected = Array.from(selectedIndexes).sort((left, right) => left - right);
  const limited = selected.slice(0, maxLinesTotal);

  return limited
    .map((index, selectedIndex) => {
      const previousIndex = limited[selectedIndex - 1];
      const prefix =
        previousIndex !== undefined && index > previousIndex + 1
          ? `\n... omitted ${index - previousIndex - 1} lines ...\n`
          : "";
      return `${prefix}${lines[index]}`;
    })
    .join("\n");
}

export function getNewDirtyPaths(currentDirtyPaths, baselineDirtyPaths) {
  const baselinePathSet = new Set(baselineDirtyPaths);
  return currentDirtyPaths.filter((path) => !baselinePathSet.has(path));
}

export function buildPrReportLine(context, stopHookActions) {
  if (!stopHookActions.autoPushPr && context.hasTaskCommit) {
    return "- PR: 自動push/PR作成は無効";
  }

  if (!stopHookActions.autoCommit && context.newDirtyPaths.length > 0) {
    return "- PR: 自動commitは無効";
  }

  if (context.hasTaskCommit && context.prUrl) {
    return `- PR: ${context.prUrl}`;
  }

  return "- PR: 変更なし・PR不要";
}

export function shouldSkipVerification(context, finalReportRequested) {
  if (finalReportRequested) {
    return true;
  }

  return !context.hasTaskCommit && context.newDirtyPaths.length === 0;
}

export function getCompletionGitStateIssue(context, stopHookActions) {
  if (context.newDirtyPaths.length > 0 && stopHookActions.autoCommit) {
    return {
      title: "New uncommitted changes remain since task start:",
      reason: [
        ...context.newDirtyPaths.map((path) => `- ${path}`),
        "",
        "Commit only task-owned changes.",
        "Do not stage or commit unrelated pre-existing dirty changes.",
        "If a pre-existing dirty file is explicitly in scope, commit only the task-required changes.",
        "Then push, create or update the PR, and finish again.",
      ].join("\n"),
      nextAction:
        "Commit only task-owned changes. Then push, create or update the PR, and finish again.",
    };
  }

  if (!context.hasTaskCommit) {
    return null;
  }

  if (!stopHookActions.autoPushPr) {
    return null;
  }

  if (context.branch === "main") {
    return {
      title: "Committed task work is on main.",
      reason:
        "Create a non-main branch for the task work, move or recreate the task commit there, push it, create or update the PR, and finish again.",
      nextAction:
        "Create a non-main branch for the task work, move or recreate the task commit there, push it, create or update the PR, and finish again.",
    };
  }

  if (!context.upstream) {
    return {
      title: "Current branch has no upstream.",
      reason: "Push the current branch with upstream, create or update the PR, and finish again.",
      nextAction:
        "Push the current branch with upstream, create or update the PR, and finish again.",
    };
  }

  if (/\[ahead \d+\]/.test(context.branchStatus)) {
    return {
      title: "Current branch has unpushed commits.",
      reason: "Push the current branch, create or update the PR, and finish again.",
      nextAction: "Push the current branch, create or update the PR, and finish again.",
    };
  }

  if (!context.prUrl) {
    return {
      title: "No pull request URL found.",
      reason: "Create or update the pull request for the current branch, then finish again.",
      nextAction: "Create or update the pull request for the current branch, then finish again.",
    };
  }

  return null;
}

export function getCreatedDirtyPaths(beforePaths, currentPaths) {
  return getNewDirtyPaths(currentPaths, beforePaths);
}
