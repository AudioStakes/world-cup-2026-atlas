#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();
const mappingFilePath = path.join(repoRoot, "workers/results/src/apiFootballFixtureMap.ts");
const matchesFilePath = path.join(repoRoot, "src/data/matches.ts");
const strict = process.argv.includes("--strict");
const failures = [];

const internalMatchIds = readInternalMatchIds(matchesFilePath);
const mappings = readFixtureMappings(mappingFilePath);

failures.push(...findDuplicates(mappings, "providerFixtureId"));
failures.push(...findDuplicates(mappings, "matchId"));

for (const mapping of mappings) {
  if (!internalMatchIds.has(mapping.matchId)) {
    failures.push(
      `${mapping.relativePath}: unknown internal matchId "${mapping.matchId}" for provider fixture ${mapping.providerFixtureId}.`,
    );
  }
}

if (strict && mappings.length !== internalMatchIds.size) {
  failures.push(
    `Strict fixture mapping requires ${internalMatchIds.size} mappings; found ${mappings.length}.`,
  );
}

if (failures.length > 0) {
  console.error("Fixture mapping check failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  `Fixture mapping check passed (${mappings.length}/${internalMatchIds.size} mapped; strict ${
    strict ? "on" : "off"
  }).`,
);

function readInternalMatchIds(filePath) {
  const sourceFile = readSourceFile(filePath);
  const matchIds = new Set();

  function visit(node) {
    if (ts.isPropertyAssignment(node) && getPropertyNameText(node.name) === "id") {
      const matchId = parseMatchIdCall(node.initializer);

      if (matchId) {
        matchIds.add(matchId);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return matchIds;
}

function readFixtureMappings(filePath) {
  const sourceFile = readSourceFile(filePath);
  let initializer = null;

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "apiFootballFixtureMappings"
    ) {
      initializer = node.initializer ? unwrapExpression(node.initializer) : null;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!initializer) {
    failures.push(`${toRelativePath(filePath)}: apiFootballFixtureMappings was not found.`);
    return [];
  }

  if (!ts.isArrayLiteralExpression(initializer)) {
    failures.push(`${toRelativePath(filePath)}: apiFootballFixtureMappings must be an array.`);
    return [];
  }

  return initializer.elements.flatMap((element) => {
    const mapping = parseMappingElement(unwrapExpression(element), toRelativePath(filePath));

    return mapping ? [mapping] : [];
  });
}

function parseMappingElement(element, relativePath) {
  if (ts.isCallExpression(element)) {
    return parseMappingFactoryCall(element, relativePath);
  }

  if (ts.isObjectLiteralExpression(element)) {
    return parseMappingObject(element, relativePath);
  }

  failures.push(`${relativePath}: unsupported fixture mapping entry.`);
  return null;
}

function parseMappingFactoryCall(element, relativePath) {
  if (
    !ts.isIdentifier(element.expression) ||
    element.expression.text !== "createApiFootballFixtureMapping"
  ) {
    failures.push(`${relativePath}: unsupported fixture mapping call expression.`);
    return null;
  }

  const providerFixtureId = getNumericLiteralValue(element.arguments[0]);
  const matchId = getStringLiteralValue(element.arguments[1]);

  if (providerFixtureId === null || matchId === null) {
    failures.push(
      `${relativePath}: createApiFootballFixtureMapping requires a numeric fixture id and string match id.`,
    );
    return null;
  }

  return { providerFixtureId, matchId, relativePath };
}

function parseMappingObject(element, relativePath) {
  let providerFixtureId = null;
  let matchId = null;

  for (const property of element.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const propertyName = getPropertyNameText(property.name);

    if (propertyName === "providerFixtureId") {
      providerFixtureId = getNumericLiteralValue(property.initializer);
    }

    if (propertyName === "matchId") {
      matchId =
        parseMatchIdCall(property.initializer) ?? getStringLiteralValue(property.initializer);
    }
  }

  if (providerFixtureId === null || matchId === null) {
    failures.push(`${relativePath}: mapping object requires providerFixtureId and matchId.`);
    return null;
  }

  return { providerFixtureId, matchId, relativePath };
}

function parseMatchIdCall(input) {
  const expression = unwrapExpression(input);

  if (
    !ts.isCallExpression(expression) ||
    !ts.isIdentifier(expression.expression) ||
    expression.expression.text !== "matchId"
  ) {
    return null;
  }

  return getStringLiteralValue(expression.arguments[0]);
}

function findDuplicates(mappings, key) {
  const seenValues = new Map();
  const duplicates = [];

  for (const mapping of mappings) {
    const value = mapping[key];
    const previous = seenValues.get(value);

    if (previous) {
      duplicates.push(
        `${mapping.relativePath}: duplicate ${key} "${value}" also appears in ${previous.relativePath}.`,
      );
    } else {
      seenValues.set(value, mapping);
    }
  }

  return duplicates;
}

function readSourceFile(filePath) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function unwrapExpression(input) {
  let expression = input;

  while (
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    expression = expression.expression;
  }

  return expression;
}

function getPropertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return null;
}

function getNumericLiteralValue(input) {
  const expression = input ? unwrapExpression(input) : null;

  if (!expression || !ts.isNumericLiteral(expression)) {
    return null;
  }

  const value = Number(expression.text);

  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function getStringLiteralValue(input) {
  const expression = input ? unwrapExpression(input) : null;

  if (
    !expression ||
    (!ts.isStringLiteral(expression) && !ts.isNoSubstitutionTemplateLiteral(expression))
  ) {
    return null;
  }

  return expression.text;
}

function toRelativePath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}
