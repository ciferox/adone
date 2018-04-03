module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": [
        "eslint:recommended"
    ],
    "parser": "babel-eslint",
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 7
    },
    "rules": {
        "babel/generator-star-spacing": 0,
        "babel/new-cap": 1,
        "object-shorthand": "error",
        "no-await-in-loop": "error",
        "arrow-parens": "error",
        "comma-dangle": 1,
        "indent": [
            "error",
            4,
            { "SwitchCase": 1 }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double",
            { "avoidEscape": true }
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-console": 0,
        "no-ex-assign": 0,
        "require-yield": 0,
        "semi-spacing": ["error", {
            "before": false,
            "after": true
        }],
        "semi-style": ["error", "last"],
        "comma-spacing": ["error", {
            "before": false,
            "after": true
        }],
        "func-call-spacing": ["error", "never"],
        "key-spacing": ["error", {
            "beforeColon": false,
            "afterColon": true
        }],
        "block-spacing": ["error", "always"],
        "array-bracket-spacing": ["error", "never"],
        "brace-style": ["error", "1tbs"],
        "one-var": ["error", {
            "let": "never",
            "const": "never"
        }],
        "no-var": "error",
        "prefer-const": "error",
        "eqeqeq": "error",
        "no-case-declarations": "error",
        "eol-last": "error",
        "keyword-spacing": ["error", {
            "before": true,
            "after": true
        }],
        "space-before-blocks": ["error", {
            "functions": "always",
            "keywords": "always",
            "classes": "always"
        }],
        "space-infix-ops": "error",
        "curly": "error",
        "object-curly-spacing": ["error", "always"],
        "strict": "error",
        "space-before-function-paren": [
            "error",
            { "anonymous": "always", "named": "never" }
        ],
        "template-curly-spacing": ["error", "never"],
        "prefer-template": "error",
        "no-const-assign": "error",
        "no-new-object": "error",
        "quote-props": ["error", "as-needed"],
        "no-array-constructor": "error",
        "array-callback-return": "error",
        "func-style": [
            "error",
            "expression", { "allowArrowFunctions": true }
        ],
        "no-loop-func": "error",
        "prefer-rest-params": "error",
        "prefer-arrow-callback": ["warn", {
            "allowNamedFunctions": true,
            "allowUnboundThis": true
        }],
        "arrow-spacing": "error",
        "no-useless-constructor": "error",
        "no-dupe-class-members": "error",
        "no-duplicate-imports": "error",
        "import/no-mutable-exports": "error",
        "dot-notation": "warn",
        "no-implicit-coercion": "error",
        "no-new-func": "error",
        "no-use-before-define": ["error", "nofunc"],
        "no-path-concat": "warn",
        "func-name-matching": "error",
        "camelcase": "error",
        "new-parens": "error",
        "yoda": "error",
        "no-throw-literal": "error",
        "max-len": ["error", {
            "code": 200,
            "ignoreStrings": true,
            "ignoreRegExpLiterals": true,
            "ignoreTemplateLiterals": true,
            "ignoreUrls": true,
            "ignoreComments": true
        }],
        "comma-style": ["error", "last"],
        "no-self-compare": "error",
        "no-else-return": "error",
        "no-empty-pattern": "error",
        "no-eval": "error",
        "no-extend-native": "error",
        "no-extra-bind": "error",
        "no-extra-label": "error",
        "no-extra-semi": "error",
        // "no-extra-parens": ["error", "all", { "nestedBinaryExpressions": false }],
        "no-fallthrough": "error",
        "no-floating-decimal": "error",
        "no-implied-eval": "error",
        "no-multi-spaces": "error",
        "no-multi-str": "error",
        "no-return-await": "error",
        "no-self-assign": "error",
        "no-unmodified-loop-condition": "warn",
        "no-useless-call": "error",
        "no-useless-return": "error",
        "no-warning-comments": "warn",
        "prefer-promise-reject-errors": "error",
        "lines-between-class-members": ["error", "always"],
        "no-path-concat": "error",  // disallow string concatenation with __dirname and __filename
        "adone/no-typeof": "error",
        "adone/no-buffer-constructor": "error",
        "adone/no-undefined-comp": "error",
        "adone/no-null-comp": "error",
        "adone/no-buffer-isbuffer": "error",
        "adone/no-array-isarray": "error",
        "adone/no-isnan": "error",
        "adone/no-number-methods": "error",  // disallow Number.isNaN, Number.isFinite etc
        "adone/no-is.undefined-or-is.null": "error", // disallow is.undefined(t) || is.null(t)
        "adone/no-not-is.undefined-and-not-is.null": "error", // disallow !is.undefined(t) && !is.null(t)
        "adone/no-function-expression-class-property": "error", // disallow properties like a = function () {
        "adone/indexof": "warn",  // warnings for include-like indexOf usages,
        "adone/multiline-comment-indent": "error",
        // "adone/multiline-method-comments": "error"
    },
    "plugins": [
        "adone",
        "babel",
        "import",
        "flowtype"
    ],
    "globals": {
        "adone": true,
    },
    "settings": {
        "flowtype": {
            "onlyFilesWithFlowAnnotation": true
        }
    }
};
