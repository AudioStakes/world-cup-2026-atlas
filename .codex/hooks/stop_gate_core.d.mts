export type StopHookActions = {
  agentLoadReport: boolean;
  autoCommit: boolean;
  autoPushPr: boolean;
};

export type StopGateContext = {
  branch?: string;
  branchStatus?: string;
  hasTaskCommit: boolean;
  currentHead?: string;
  newDirtyPaths: string[];
  prHeadRefOid?: string;
  prUrl?: string;
  upstream?: string;
};

export type ToggleParseResult = {
  enabled: boolean;
  warning?: string;
};

export type CompletionGitStateIssue = {
  title: string;
  reason: string;
  nextAction: string;
} | null;

export function parseStopHookToggleValue(
  rawValue: string | undefined,
  name?: string,
): ToggleParseResult;

export function getInputStrings(value: unknown): string[];
export function isFinalReportResponse(value: unknown): boolean;
export function formatHookJson(value: unknown): string;
export function buildBlockResponse(
  title: string,
  reason?: string,
): {
  decision: "block";
  reason: string;
};
export function buildFinalResponseReason(options: {
  prReportLine: string;
  instructionFeedbackPrompt?: string;
}): string;
export function parseStatusPaths(statusOutput: string): string[];
export function compactOutput(
  output: string,
  options?: {
    contextRadius?: number;
    tailLines?: number;
    maxLinesTotal?: number;
    importantLinePatterns?: RegExp[];
  },
): string;
export function getNewDirtyPaths(
  currentDirtyPaths: string[],
  baselineDirtyPaths: string[],
): string[];
export function buildPrReportLine(
  context: StopGateContext,
  stopHookActions: StopHookActions,
): string;
export function shouldSkipVerification(
  context: StopGateContext,
  finalReportRequested: boolean,
): boolean;
export function getCompletionGitStateIssue(
  context: StopGateContext,
  stopHookActions: StopHookActions,
): CompletionGitStateIssue;
export function getCreatedDirtyPaths(beforePaths: string[], currentPaths: string[]): string[];
