const {
    is,
    inspect
} = adone;

export default (options, stack) => {
    if (arguments.length < 2) {
        stack = options; options = {};
    } else if (!options || typeof options !== "object") {
        options = {};
    }

    if (!options.style) {
        options.style = inspect.defaultStyle;
    } else if (is.string(options.style)) {
        options.style = inspect.style[options.style];
    }

    if (!stack) {
        return;
    }

    if ((options.browser || process.browser) && stack.indexOf("@") !== -1) {
        // Assume a Firefox-compatible stack-trace here...
        stack = stack
            .replace(/[</]*(?=@)/g, "")	// Firefox output some WTF </</</</< stuff in its stack trace -- removing that
            .replace(
                /^\s*([^@]*)\s*@\s*([^\n]*)(?::([0-9]+):([0-9]+))?$/mg,
                (matches, method, file, line, column) => {
                    return options.style.errorStack("    at ") +
                        (method ? `${options.style.errorStackMethod(method)} ` : "") +
                        options.style.errorStack("(") +
                        (file ? options.style.errorStackFile(file) : options.style.errorStack("unknown")) +
                        (line ? options.style.errorStack(":") + options.style.errorStackLine(line) : "") +
                        (column ? options.style.errorStack(":") + options.style.errorStackColumn(column) : "") +
                        options.style.errorStack(")");
                }
            );
    } else {
        stack = stack.replace(/^[^\n]*\n/, "");
        stack = stack.replace(
            /^\s*(at)\s+(?:((?:new +)?[^\s:()[\]\n]+(?:\([^)]+\))?)\s)?(?:\[as ([^\s:()[\]\n]+)\]\s)?(?:\(?([^:()[\]\n]+):([0-9]+):([0-9]+)\)?)?$/mg,
            (matches, at, method, as, file, line, column) => {
                return options.style.errorStack("    at ") +
                    (method ? `${options.style.errorStackMethod(method)} ` : "") +
                    (as ? options.style.errorStack("[as ") + options.style.errorStackMethodAs(as) + options.style.errorStack("] ") : "") +
                    options.style.errorStack("(") +
                    (file ? options.style.errorStackFile(file) : options.style.errorStack("unknown")) +
                    (line ? options.style.errorStack(":") + options.style.errorStackLine(line) : "") +
                    (column ? options.style.errorStack(":") + options.style.errorStackColumn(column) : "") +
                    options.style.errorStack(")");
            }
        );
    }

    return stack;
};
