const styler = adone.terminal.styler;

const BRACKET = /^[()\[\]{}]$/;
const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;

export class Highlighter {
    getTokenType(match) {
        const token = adone.js.tokens.matchToToken(match);

        if (token.type === "name") {
            // todo: es7?
            if (
                adone.js.compiler.esutils.keyword.isReservedWordES6(token.value)
                || token.value === "async"
                || token.value === "await"
            ) {
                return "keyword";
            }

            if (token.value[0] !== token.value[0].toLowerCase()) {
                return "capitalized";
            }
        }

        if (token.type === "punctuator" && BRACKET.test(token.value)) {
            // TODO: the output wrong for some reason
            // const { value } = token;
            // if (value === "[" || value === "]") {
            //     return "square.bracket";
            // }
            // if (value === "{" || value === "}") {
            //     return "curly.bracket";
            // }
            return "bracket";
        }

        if (
            token.type === "invalid" &&
            (token.value === "@" || token.value === "#")
        ) {
            return "punctuator";
        }
        return token.type;
    }

    highlight(code) {
        return code.replace(adone.js.tokens.regex, (...args) => {
            const type = this.getTokenType(args);
            return args[0]
                .split(NEWLINE)
                .map((str) => this.colorize(str, type))
                .join("\n");
        });
    }

    colorize(str, type) {
        switch (type) {
            case "keyword":
                return styler.cyan(str);
            case "comment":
                return styler.dim(str);
            case "number":
                return styler.yellow(str);
            case "string":
                return styler.green(str);
            case "regex": {
                const match = str.match(/^\/(.+)\/([gimuy]*)$/);
                const src = match[1];
                const flags = match[2] || "";
                return `${styler.green("/")}${styler.cyan(src)}${styler.green("/")}${styler.magenta(flags)}`;
            }
            case "bracket":
                return styler.dim(str);
            case "name":
                return str; // TODO: highlight somehow
            default:
                return str;
        }
    }
}

export const highlight = (code) => new Highlighter().highlight(code);
