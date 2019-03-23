/**
 *  eslint-disable func-style
 */
const {
    js: { tokens: { matchToToken, regex: jsTokens }, esutils },
    cli: { chalk, stats }
} = adone;

/**
 * Chalk styles for token types.
 */
const getDefs = (chalk) => ({
    keyword: chalk.cyan,
    capitalized: chalk.yellow,
    jsx_tag: chalk.yellow,
    punctuator: chalk.yellow,
    // bracket:  intentionally omitted.
    number: chalk.magenta,
    string: chalk.green,
    regex: chalk.magenta,
    comment: chalk.grey,
    invalid: chalk.white.bgRed.bold
});

/**
 * RegExp to test for newlines in terminal.
 */
const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;

/**
 * RegExp to test for what seems to be a JSX tag name.
 */
const JSX_TAG = /^[a-z][\w-]*$/i;

/**
 * RegExp to test for the three types of brackets.
 */
const BRACKET = /^[()[\]{}]$/;

/**
 * Get the type of token, specifying punctuator type.
 */
const getTokenType = (match) => {
    const [offset, text] = match.slice(-2);
    const token = matchToToken(match);

    if (token.type === "name") {
        if (esutils.keyword.isReservedWordES6(token.value)) {
            return "keyword";
        }

        if (
            JSX_TAG.test(token.value) &&
            (text[offset - 1] === "<" || text.substr(offset - 2, 2) == "</")
        ) {
            return "jsx_tag";
        }

        if (token.value[0] !== token.value[0].toLowerCase()) {
            return "capitalized";
        }
    }

    if (token.type === "punctuator" && BRACKET.test(token.value)) {
        return "bracket";
    }

    if (
        token.type === "invalid" &&
        (token.value === "@" || token.value === "#")
    ) {
        return "punctuator";
    }

    return token.type;
};

/**
 * Highlight `text` using the token definitions in `defs`.
 */
const highlightTokens = (defs: Object, text: string) => text.replace(jsTokens, (...args) => {
    const type = getTokenType(args);
    const colorize = defs[type];
    if (colorize) {
        return args[0]
            .split(NEWLINE)
            .map((str) => colorize(str))
            .join("\n");
    }
    return args[0];
});

type Options = {
    forceColor?: boolean,
};

/**
 * Whether the code should be highlighted given the passed options.
 */
const shouldHighlight = (options: Options): boolean => stats.stdout || options.forceColor;

/**
 * The Chalk instance that should be used given the passed options.
 */
const getChalk = (options: Options) => options.forceColor
    ? new chalk.Instance({ enabled: true, level: 1 })
    : chalk;


/**
 * Highlight `code`.
 */
export default function highlight(code: string, options: Options = {}): string {
    if (shouldHighlight(options)) {
        const defs = getDefs(getChalk(options));
        return highlightTokens(defs, code);
    }
    return code;
}

highlight.shouldHighlight = shouldHighlight;
