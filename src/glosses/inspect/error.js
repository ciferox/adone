const {
    is,
    inspect
} = adone;

export default (options, error) => {
    let str = "";
    let stack;

    if (arguments.length < 2) {
        error = options; options = {};
    } else if (!options || typeof options !== "object") {
        options = {};
    }

    if (!(error instanceof Error)) {
        return `Not an error -- regular variable inspection: ${adone.inspect(options, error)}`;
    }

    if (!options.style) {
        options.style = inspect.defaultStyle;
    } else if (is.string(options.style)) {
        options.style = inspect.style[options.style];
    }

    if (error.stack && !options.noErrorStack) {
        stack = inspect.inspectStack(options, error.stack);
    }

    const type = error.type || error.constructor.name;
    const code = error.code || error.name || error.errno || error.number;

    str += `${options.style.errorType(type) +
        (code ? ` [${options.style.errorType(code)}]` : "")}: `;
    str += `${options.style.errorMessage(error.message)}\n`;

    if (stack) {
        str += `${options.style.errorStack(stack)}\n`;
    }

    return str;
};
