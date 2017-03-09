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
            {"anonymous": "always", "named": "never"}
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
            "allowUnboundThis": false
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
            "code": 100,
            "ignoreStrings": true,
            "ignoreRegExpLiterals": true,
            "ignoreTemplateLiterals": true,
            "ignoreUrls": true,
            "ignoreComments": true
        }]
    },
    "plugins": [
        "babel",
        "import"
    ],
    "globals": {
        "adone": true,
        "describe": true,
        "it": true,
        "before": true,
        "after": true,
        "beforeEach": true,
        "afterEach": true,
        "expect": true,
        "assert": true,
        "specify": true,
        "context": true,
        "spy": true,
        "stub": true,
        "mock": true,
        "match": true,
        "FS": true,
        "skip": true,
        "$": true,  // only for tests...
        "request": true
    }
};
