const globalClassPattern =
  "^(?:is-[a-z0-9-]+|[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+-?)+)?(?:--(?:[a-z0-9]+-?)+)?)$";

const moduleClassPattern = "^(?:root|[a-z][a-zA-Z0-9]*|is[A-Z][a-zA-Z0-9]*)$";

/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard"],
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  rules: {
    "color-no-invalid-hex": true,
    "custom-property-pattern": "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$",
    "declaration-block-no-duplicate-properties": true,
    "declaration-block-no-shorthand-property-overrides": true,
    "declaration-no-important": true,
    "font-family-no-duplicate-names": true,
    "font-family-no-missing-generic-family-keyword": true,
    "keyframes-name-pattern": "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$",
    "layer-name-pattern": "^(reset|tokens|base|layout|components|map|utilities|overrides)$",
    "length-zero-no-unit": true,
    "media-feature-name-no-unknown": true,
    "no-descending-specificity": true,
    "no-duplicate-selectors": true,
    "no-invalid-position-at-import-rule": true,
    "no-unknown-animations": true,
    "property-no-unknown": true,
    "selector-class-pattern": globalClassPattern,
    "selector-max-class": 3,
    "selector-max-combinators": 3,
    "selector-max-id": 0,
    "selector-max-specificity": "0,3,0",
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
    "selector-type-no-unknown": true,
    "unit-no-unknown": true,
  },
  overrides: [
    {
      files: ["src/styles/base.css"],
      rules: {
        "selector-max-id": 1,
        "selector-max-specificity": "1,0,0",
      },
    },
    {
      files: ["src/styles/map.css"],
      rules: {
        "selector-max-class": 5,
        "selector-max-combinators": 5,
        "selector-max-specificity": "0,5,0",
      },
    },
    {
      files: ["src/**/*.module.css"],
      rules: {
        "selector-class-pattern": moduleClassPattern,
      },
    },
  ],
};
