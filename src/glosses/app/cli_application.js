const {
    is,
    error,
    std,
    text,
    pretty,
    util,
    runtime: { term },
    tag,
    terminal: { chalk },
    app,
    meta: { reflect }
} = adone;

const {
    EXIT_SUCCESS,
    STATE
} = app;

// Temporary here...
const {
    Context,
    Public
} = adone.netron;

@Context()
class CliContext {
    constructor(app) {
        this.app = app;
    }

    @Public()
    defineArguments(options) {
        return this.app.defineArguments(options);
    }

    @Public()
    defineCommand(subsystem, ...args) {
        return this.app.defineCommand(subsystem, ...args);
    }

    @Public()
    defineCommandFromSubsystem(...args) {
        // Should be implemented
    }

    @Public()
    exitOnSignal(signame) {
        return this.app.exitOnSignal(signame);
    }
}

const noStyleLength = (x) => text.stripAnsi(x).length;

const hasColorsSupport = Boolean(process.stdout.isTTY);

const defaultColors = {
    commandName: (x) => term.parse(`{#4CAF50-fg}${x}{/}`),
    commandHelpMessage: (x) => chalk.italic(x),
    commandSeparator: (x) => x,
    optionName: (x) => term.parse(`{#00B0FF-fg}${x}{/}`),
    optionVariable: (x) => x,
    optionHelpMessage: (x) => chalk.italic(x),
    // argumentName: (x) => x,
    argumentName: (x) => term.parse(`{#F44336-fg}${x}{/}`),
    argumentHelpMessage: (x) => chalk.italic(x),
    default: (x) => chalk.grey(x),
    // angleBracket: (x) => term.green(x),
    angleBracket: (x) => term.parse(`{#F44336-fg}${x}{/}`),
    squareBracket: (x) => chalk.yellow(x),
    curlyBracket: (x) => chalk.yellow(x),
    ellipsis: (x) => chalk.dim(x),
    usage: (x) => chalk.underline(x),
    commandGroupHeading: (x) => chalk.underline(x),
    argumentGroupHeading: (x) => chalk.underline(x),
    optionGroupHeading: (x) => chalk.underline(x),
    value: {
        string: (x) => chalk.green(x),
        null: (x) => chalk.yellow(x),
        number: (x) => chalk.yellow(x),
        undefined: (x) => chalk.yellow(x),
        boolean: (x) => chalk.yellow(x),
        object: {
            key: (x) => x,
            separator: (x) => chalk.cyan(x)
        }
    }
};

// Annotations.
const SUBSYSTEM_ANNOTATION = "subsystem";

// Symbols for private proerties.
const INTERNAL = Symbol();
const UNNAMED = Symbol();
const EMPTY_VALUE = Symbol();
const COMMAND = Symbol();
const ERROR_SCOPE = Symbol.for("adone.app.Application#errorScope");
const MAIN_COMMAND = Symbol.for("adone.app.CliApplication#mainCommand");
const VERSION = Symbol();

const escape = (x) => x.replace(/%/g, "%%");

class Argument {
    constructor(options = {}, command) {
        options = Argument.normalize(options, command, this);

        this.names = options.name;
        this.action = options.action;
        this.nargs = options.nargs;
        this._default = options.default;
        this.type = options.type;
        this.description = options.description;
        this.required = options.required;
        this.holder = options.holder;
        this.choices = options.choices && options.choices.slice();
        this._value = EMPTY_VALUE;
        this.present = false;
        this.internal = options[INTERNAL] === true;
        this.const = options.const;
        this.appendDefaultHelpMessage = options.appendDefaultMessage;
        this.appendChoicesHelpMessage = options.appendChoicesHelpMessage;
        this.colors = options.colors;
        this._frozenColors = options._frozenColors;
        this._verify = options.verify;
        this.set = options.set;
        this.enabled = options.enabled;
        this.setCommand(command);
    }

    setCommand(command) {
        this.command = command;
        if (hasColorsSupport && !this._frozenColors) {
            if (!this.command.colors) {
                this.colors = this.command.colors;
            } else {
                this.colors = util.assignDeep({}, this.command.colors, this.colors);
            }
        }
    }

    get default() {
        if (this._default !== EMPTY_VALUE) {
            return this._default;
        }
        switch (this.action) {
            case "store_true":
                return false;
            case "store_false":
                return true;
            case "count":
                return 0;
            case "append":
                return [];
        }
        if (this.nargs === "*") {
            return [];
        }
        return this._default;
    }

    get value() {
        if (!this.hasValue()) {
            return this.default;
        }
        return this._value;
    }

    set value(value) {
        this._value = value;
    }

    coerce(value) {
        const _coerce = (type, ...args) => {
            if (is.class(type)) {
                return new type(value, ...args);
            }
            if (is.function(type)) {
                return type(value, ...args);
            }
            if (is.regexp(type)) {
                const match = value.match(type);
                if (is.null(match)) {
                    const err = new error.Exception(`Incorrect value, must match ${type}`);
                    err.fatal = true;
                    throw err;
                }
                return match;
            }
        };

        if (is.array(this.type)) {
            return _coerce(this.type[this.value.length]);
        }
        if (is.array(this.value)) {
            return _coerce(this.type, this.value.length);
        }
        return _coerce(this.type);
    }

    hasVerifier() {
        return !is.null(this._verify);
    }

    async verify(args, opts) { // rest ?
        let res;
        try {
            res = await this._verify(args, opts);
        } catch (err) {
            throw new error.InvalidArgument(`verification of ${this.names[0]} failed due to "${err.message}"`);
        }
        // each non-true value is recognized as an error
        if (res !== true) {
            const message = is.string(res) ? res : `verification of ${this.names[0]} failed`;
            throw new error.InvalidArgument(message);
        }
    }

    hasValue() {
        return this._value !== EMPTY_VALUE;
    }

    hasDefaultValue() {
        if (
            this.action === "store_true" ||
            this.action === "store_false" ||
            this.action === "store_const" ||
            this.action === "count" ||
            this.nargs === "*"
        ) {
            return true;
        }
        return this.default !== EMPTY_VALUE;
    }

    match(arg) {
        if (is.string(arg)) {
            return this.names.includes(arg);
        }

        if (arg instanceof Argument) {
            for (const name of arg.names) {
                if (this.match(name)) {
                    return true;
                }
            }
            return false;
        }
        throw new error.InvalidArgument();
    }

    get positional() {
        throw new error.NotImplemented();
    }

    get optional() {
        throw new error.NotImplemented();
    }

    static normalize(options, cmd, arg) {
        if (is.string(options)) {
            options = { name: options };
        } else {
            options = adone.o(options);
        }
        if (!options.name || options.name.length === 0) {
            const type = arg.positional ? "a positional" : "an optional";
            throw new error.IllegalState(`${cmd.getCommandChain()}: you are trying to define ${type} argument with no name`);
        }
        options.name = util.arrify(options.name);

        const [name] = options.name;

        const invalid = (msg) => {
            const t = arg.positional ? "argument" : "option";
            return new error.InvalidArgument(`${cmd.getCommandChain()} / "${name}" ${t}: ${msg}`);
        };
        if (options.action) {
            if (!["store", "store_const", "store_true", "store_false", "append", "count", "set"].includes(options.action)) {
                throw invalid(`action should be one of [store, store_const, store_true, store_false, append, append_const, count] but got ${options.action}`);
            }
            switch (options.action) {
                case "store_true":
                case "store_false":
                case "store_const":
                case "count":
                    if (options.choices) {
                        throw invalid(`cannot use choices with action ${options.action}`);
                    }
                    if ("nargs" in options && options.nargs !== 0) {
                        throw invalid(`nargs should be 0 for ${options.action}`);
                    } else {
                        options.nargs = 0;
                    }
                    break;
                case "set": {
                    if (!options.choices) {
                        throw invalid("cannot use 'set' action without choices");
                    }
                    if ("nargs" in options) {
                        throw invalid("cannot use nargs with 'set' action");
                    }
                    switch (options.set) {
                        case "defaultTrue":
                            options.set = (isSpecified) => isSpecified ? false : true;
                            break;
                        case "defaultFalse":
                            options.set = (isSpecified) => isSpecified ? true : false;
                            break;
                        case undefined:
                        case "undefinedOnEmpty":
                        case "defaultUndefined":
                            options.set = (isSpecified) => isSpecified ? true : undefined;
                            break;
                        case "trueOnEmpty":
                            options.set = (isSpecified, name, totalNum) => {
                                if (totalNum === 0) {
                                    return true;
                                }
                                return isSpecified ? true : undefined;
                            };
                            break;
                        case "falseOnEmpty":
                            options.set = (isSpecified, name, totalNum) => {
                                if (totalNum === 0) {
                                    return false;
                                }
                                return isSpecified ? true : undefined;
                            };
                            break;
                        default: {
                            if (!is.function(options.set)) {
                                throw invalid("'set' must be a function or one of: defaultTrue, defaultFalse, defaultUndefined, trueOnEmpty, falseOnEmpty, undefinedOnEmpty");
                            }
                        }
                    }
                    options.nargs = "*";
                    break;
                }
                case "store":
                case "append":
                    if ("nargs" in options) {
                        if (is.integer(options.nargs)) {
                            if (options.nargs < 1) {
                                throw invalid(`nargs should be a positive integer for ${options.action}`);
                            }
                        } else if (!["*", "+", "?"].includes(options.nargs)) {
                            throw invalid("nargs should be a positive integer or one of [+, *, ?]");
                        }
                    } else {
                        options.nargs = 1;
                    }
                    break;
            }
        } else if (options.nargs) {
            if ((is.integer(options.nargs) && options.nargs < 1) || (!is.integer(options.nargs) && !["+", "*", "?"].includes(options.nargs))) {
                throw invalid("nargs should be a positive integer or one of [+, *, ?]");
            }
            options.action = "store";
        } else {
            options.action = "store";
            options.nargs = 1;
        }

        if (!options.type) {
            options.type = String;
        } else if (is.array(options.type)) {
            if (options.nargs === "*" || options.nargs === "+") {
                throw invalid("using the variadic nargs with a list of types is ambiguous");
            }
            if (is.integer(options.nargs) && options.nargs !== options.type.length) {
                throw invalid("the number of types must be equal to the number of arguments");
            }
        }

        if (options.verify) {
            if (!is.function(options.verify)) {
                throw invalid("verify must be a function");
            }
        } else {
            options.verify = null;
        }


        if (!options.required) {
            options.required = false;
        }

        if (!is.string(options.description)) {
            if (is.string(options.help)) {
                options.description = options.help;
            } else {
                options.description = "";
            }
        }

        if (!options.choices) {
            options.choices = null;
        } else {
            options.choices = [...options.choices];
        }
        if (options.holder) {
            const checkHolder = (holder, i) => {
                const index = is.integer(i) ? `[${i}]` : "";
                if (!is.string(holder)) {
                    throw invalid(`${index} holder must be a string`);
                }
                if (/\s/.test(holder)) {
                    throw invalid(`${index} holder cannot have space characters: ${options.holder}`);
                }
            };
            if (!is.integer(options.nargs) || options.nargs === 1) {
                checkHolder(options.holder);
            } else {
                if (!is.array(options.holder)) {
                    throw invalid("you must specify a holder for each argument");
                }
                for (let i = 0; i < options.nargs; ++i) {
                    checkHolder(options.holder[i], i);
                }
            }
            options.holder = util.arrify(options.holder);
        } else {
            options.holder = null;
        }

        if (options.format) {
            if (!is.function(options.format)) {
                throw invalid("format must be a function");
            }
        } else {
            options.format = null;
        }

        if (!("appendDefaultHelpMessage" in options)) {
            options.appendDefaultMessage = true;
        } else {
            options.appendDefaultMessage = Boolean(options.appendDefaultMessage);
        }

        if (!("appendChoicesHelpMessage" in options)) {
            options.appendChoicesHelpMessage = true;
        } else {
            options.appendChoicesHelpMessage = Boolean(options.appendChoicesHelpMessage);
        }
        if (!("default" in options)) {
            options.default = EMPTY_VALUE;
        }

        if (!hasColorsSupport) {
            options.colors = false;
        } else if (options.colors === "default") {
            options.colors = util.clone(defaultColors);
            options._frozenColors = true;
        } else if (is.object(options.colors)) {
            if (options.colors.inherit === false) {
                options.colors = util.assignDeep({}, defaultColors, options.colors);
                delete options.colors.inherit;
                options._frozenColors = true;
            }
        } else if (options.colors === false) {
            options._frozenColors = true;
        }

        if ("enabled" in options) {
            options.enabled = Boolean(options.enabled);
        } else {
            options.enabled = true;
        }

        return options;
    }

    _formatValue(x) {
        const type = adone.meta.typeOf(x);

        switch (type) {
            case "string": {
                x = `"${x}"`;
                if (this.colors) {
                    return this.colors.value.string(x);
                }
                return x;
            }
            case "number":
            case "null":
            case "undefined":
            case "boolean": {
                x = String(x);
                if (this.colors) {
                    return this.colors.value[type](x);
                }
                return x;
            }
            case "Array": {
                return `[${x.map((y) => this._formatValue(y)).join(", ")}]`;
            }
            case "Object": {
                const separator = this.colors ? this.colors.value.object.separator(":") : ":";
                let res = "{";
                const entries = util.entries(x).map(([key, value]) => {
                    key = this.colors ? this.colors.value.object.key(key) : key;
                    return `${key}${separator} ${this._formatValue(value)}`;
                });
                if (entries.length) {
                    res += ` ${entries.join(", ")} `;
                }
                res += "}";
                return res;
            }
            default:
                return JSON.stringify(x);
        }
    }

    _help() {
        return this.description;
    }

    getShortHelpMessage() {
        let msg = this._help();

        if (this.appendChoicesHelpMessage && this.choices) {
            const formatted = this.choices.map((x) => this._formatValue(x)).join(", ");
            if (msg) {
                msg = `${msg} `;
            }
            msg = `${msg}(${formatted})`;
        }

        if (this.appendDefaultHelpMessage && this.action === "store" && this.hasDefaultValue()) {
            const value = this._formatValue(this.default);
            if (msg) {
                msg = `${msg}\n`;
            }
            if (this.colors) {
                msg = `${msg}${this.colors.default("default:")} ${value}`;
            } else {
                msg = `${msg}default: ${value}`;
            }
        }
        return msg;
    }
}

class PositionalArgument extends Argument {
    constructor(options = {}, command) {
        if (is.string(options)) {
            options = { name: options };
        }
        if ("default" in options && !("nargs" in options)) {
            options.nargs = "?";
        }
        options = adone.o({
            action: "store",
            required: !(options.nargs === "?" || options.nargs === "*" || (!("nargs" in options) && options.choices))
        }, options);
        super(options, command);
        if ("action" in options && options.action !== "store" && options.action !== "set") {
            throw new error.IllegalState(`${this.names[0]}: A positional agrument must have action 'store' or 'set'`);
        }
        if (this.names.length > 1) {
            throw new error.IllegalState(`${this.names[0]}: A positional argument cannot have multiple names`);
        }
        if (this.names[0][0] === "-") {
            throw new error.IllegalState(`${this.names[0]}: The name of a positional argument cannot start with "-"`);
        }
    }

    get positional() {
        return true;
    }

    get optional() {
        return false;
    }

    get usageVariables() {
        if (this.holder) {
            return this.holder;
        }
        return [this.names[0]];
    }

    getUsageMessage({ required = true } = {}) {
        const uaOpenBracket = this.colors ? this.colors.angleBracket("<") : "<";
        const uaCloseBracket = this.colors ? this.colors.angleBracket(">") : ">";
        const openBracket = this.colors ? this.colors.squareBracket("[") : "[";
        const closeBracket = this.colors ? this.colors.squareBracket("]") : "]";
        const ellipsis = this.colors ? this.colors.ellipsis("...") : "...";
        let usageVariables = this.usageVariables;
        if (this.colors) {
            usageVariables = usageVariables.map(this.colors.argumentName);
        }
        const formatVar = (v) => `${uaOpenBracket}${v}${uaCloseBracket}`;
        let msg = null;
        if (this.nargs === "+") {
            const t = formatVar(usageVariables[0]);
            msg = `${t} ${openBracket}${t} ${ellipsis}${closeBracket}`;
        } else if (this.nargs === "*") {
            msg = `${openBracket}${formatVar(usageVariables[0])} ${ellipsis}${closeBracket}`;
        } else if (this.nargs === "?") {
            msg = `${openBracket}${formatVar(usageVariables[0])}${closeBracket}`;
        } else if (is.integer(this.nargs)) {
            msg = usageVariables.map(formatVar).join(" ");
        }

        if (required && !this.required && this.nargs !== "*" && this.nargs !== "?") {
            const openBrace = this.colors ? this.colors.squareBracket("[") : "[";
            const closeBrace = this.colors ? this.colors.squareBracket("]") : "]";
            msg = `${openBrace}${msg}${closeBrace}`;
        }

        return msg;
    }

    _help() {
        return this.colors ? this.colors.argumentHelpMessage(this.description) : this.description;
    }

    getNamesMessage() {
        if (this.holder) {
            return (this.colors ? this.holder.map(this.colors.argumentName) : this.holder).join(", ");
        }
        return this.names.map((x) => {
            return this.colors ? this.colors.argumentName(x) : x;
        }).join(", ");
    }
}

class OptionalArgument extends Argument {
    constructor(options = {}, command) {
        if (is.string(options)) {
            options = { name: options };
        }
        super(adone.o({
            action: (options.choices || options.nargs || (options.type && options.type !== Boolean)) ? "store" : "store_true"
        }, options), command);
        for (const name of this.names) {
            if (name[0] !== "-") {
                throw new error.IllegalState(`${this.names[0]}: The name of an optional argument must start with "-": ${name}`);
            }
            if (/\s/.test(name)) {
                throw new error.IllegalState(`${this.names[0]}: The name of an optional argument cannot have space characters: ${name}`);
            }
            if (/^-+$/.test(name)) {
                throw new error.IllegalState(`${this.names[0]}: The name of an optional argument must have a name: ${name}`);
            }
        }
        if (this.action === "set") {
            throw new error.IllegalState(`${this.names[0]}: Cannot use 'set' action with an optional argument`);
        }
        this.group = options.group || UNNAMED;
        this.handler = options.handler || adone.noop;
        this.mappedNames = null;
    }

    match(name, { raw = true } = {}) {
        if (raw) {
            return super.match(name);
        }
        if (is.null(this.mappedNames)) {
            this.mappedNames = [
                ...this.names,
                ...this.names.map((x) => {
                    let i = 0;
                    while (x[i] === "-") {
                        ++i;
                    }
                    return x.slice(i);
                }),
                ...this.names.map((x) => text.toCamelCase(x))
            ];
        }
        return this.mappedNames.includes(name);
    }

    get positional() {
        return false;
    }

    get optional() {
        return true;
    }

    get usageVariables() {
        if (this.holder) {
            return this.holder;
        }

        const s = this.names[0].toUpperCase();
        let i = 0;
        while (s[i] === "-") {
            ++i;
        }
        return [s.slice(i)];
    }

    getUsageMessage({ required = true, allNames = false } = {}) {
        let msg = (allNames ? this.names : this.names.slice(0, 1)).map((x) => {
            return this.colors ? this.colors.optionName(x) : x;
        }).join(", ");

        const openBrace = this.colors ? this.colors.squareBracket("[") : "[";
        const closeBrace = this.colors ? this.colors.squareBracket("]") : "]";
        const ellipsis = this.colors ? this.colors.ellipsis("...") : "...";

        let usageVariables = this.usageVariables;

        if (this.colors) {
            usageVariables = usageVariables.map(this.colors.optionVariable);
        }

        if (this.nargs === "+") {
            msg = `${msg} ${usageVariables[0]} ${openBrace}${usageVariables[0]} ${ellipsis}${closeBrace}`;
        } else if (this.nargs === "*") {
            msg = `${msg} ${openBrace}${usageVariables[0]} ${ellipsis}${closeBrace}`;
        } else if (this.nargs === "?") {
            msg = `${msg} ${openBrace}${usageVariables[0]}${closeBrace}`;
        } else if (is.integer(this.nargs) && this.nargs) {
            msg = `${msg} ${usageVariables.join(" ")}`;
        }
        if (required && !this.required) {
            msg = `${openBrace}${msg}${closeBrace}`;
        }
        return msg;
    }

    _help() {
        return this.colors ? this.colors.optionHelpMessage(this.description) : this.description;
    }

    getNamesMessage() {
        return this.names.join(", ");
    }
}

const argumentsWrap = (args, maxLength) => {
    const lines = [];
    let length = 0;
    let line = [];
    for (let i = 0; i < args.length; ++i) {
        const arg = args[i];
        const len = noStyleLength(arg);
        if (length + len + 1 >= maxLength && line.length !== 0) {
            lines.push(line.join(" "));
            line = [];
            length = 0;
        }
        length += len + 1;
        line.push(arg);
    }
    if (line.length) {
        lines.push(line.join(" "));
    }
    // if (lines.length > 1) {
    // const last = lines[lines.length - 1];
    // lines[lines.length - 1] = new Array(maxLength - last.length).join(" ") + last;
    // }
    return lines.join("\n");
};

const commandsWrap = (cmds, maxLength, colors) => {
    const lines = [];
    let length = 0;
    let line = [];
    const separator = ` ${colors ? colors.commandSeparator("|") : "|"} `;
    const openBrace = colors ? colors.curlyBracket("{") : "{";
    const closeBrace = colors ? colors.curlyBracket("}") : "}";
    for (let i = 0; i < cmds.length; ++i) {
        const cmd = cmds[i];
        if (line.length !== 0 && length + 3 + noStyleLength(cmd) + 2 > maxLength) {
            lines.push(line.join(separator));
            line = [];
            length = 0;
        }
        if (line.length === 0) {
            if (lines.length === 0) {
                line.push(`${openBrace} ${cmd}`);
            } else {
                line.push(`  ${cmd}`);
            }
            length += 2 + noStyleLength(cmd);
        } else {
            line.push(cmd);
            length += 3 + noStyleLength(cmd);
        }
    }
    if (line.length) {
        lines.push(line.join(separator));
    }
    lines[lines.length - 1] = `${lines[lines.length - 1]} ${closeBrace}`;
    return lines.join("\n");
};

class Group {
    constructor(params) {
        if (!is.object(params)) {
            params = String(params);
            this.name = params;
            this.description = text.capitalize(params);
        } else {
            this.name = params.name;
            this.description = params.description;
        }
        this.elements = [];
    }

    get length() {
        return this.elements.length;
    }

    get empty() {
        return this.length === 0;
    }

    has(element) {
        for (const el of this.elements) {
            if (el.match(element)) {
                return true;
            }
        }
        return false;
    }

    add(arg) {
        this.elements.push(arg);
    }

    [Symbol.iterator]() {
        return this.elements[Symbol.iterator]();
    }
}

class ArgumentsMap {
    constructor(args) {
        this.args = new Map();
        this._allRaw = {};
        for (const arg of args) {
            let counter = 0;
            for (let name of arg.names) {
                let i = 0;
                while (name[i] === "-") {
                    ++i;
                }
                name = name.slice(i);
                this.args.set(name, arg);
                const camalized = text.toCamelCase(name);
                this.args.set(camalized, arg);
                if (counter++ === 0 && camalized !== "help") {
                    this._allRaw[camalized] = this.get(camalized);
                }
            }
        }
    }

    getAll(onlyDefined = false) {
        if (onlyDefined) {
            const result = {};
            for (const [key, value] of Object.entries(this._allRaw)) {
                if (this.has(key)) {
                    result[key] = value;
                }
            }

            return result;
        }
        return this._allRaw;

    }

    get(key, defaultValue = EMPTY_VALUE) {
        if (!this.args.has(key)) {
            throw new error.Unknown(`No such argument: ${key}`);
        }
        const arg = this.args.get(key);
        if (arg.present || arg.hasDefaultValue()) {
            const { value } = arg;
            if (value !== EMPTY_VALUE) {
                return value;
            }
        }
        if (defaultValue !== EMPTY_VALUE) {
            return defaultValue;
        }
        switch (arg.type) {
            case String: {
                return "";
            }
            case Number: {
                return 0;
            }
        }
        if (arg.type === String) {
            return "";
        }
        if (arg.type === Number) {
            return 0;
        }
        if (is.class(arg.type)) {
            // eslint-disable-next-line
            return new arg.type(null);
        }
        if (is.function(arg.type)) {
            return arg.type(null);
        }
        // array type?
    }

    has(key) {
        if (!this.args.has(key)) {
            return false;
        }
        const arg = this.args.get(key);
        if (arg.optional) {
            return arg.present;
        }
        if (arg.present) {
            return true;
        }
        // positional, not present
        if (!arg.required || (arg.nargs === "*" || arg.nargs === "?")) {
            return arg.hasDefaultValue();
        }
        // impossible case? parser must throw if a required arg is not present
        return true;
    }

    hasSomething() {
        const keys = [...this.args.keys()].filter((n) => n !== "h" && n !== "help");

        for (const key of keys) {
            if (this.has(key)) {
                return true;
            }
        }

        return false;
    }
}

class Command {
    constructor(options = {}) {
        options = this.constructor.normalize(options);
        this.names = options.name;
        this.description = options.description;
        this.loader = options.loader;
        this.handler = options.handler;
        this.parent = null;
        this._subsystem = null;
        this.arguments = [];
        this.group = options.group;
        this._match = options.match;
        this.blindMode = options.blindMode;

        this.optionsGroups = [new Group({ name: UNNAMED })];
        this.commandsGroups = [new Group({ name: UNNAMED })];
        this.colors = options.colors;
        this._frozenColors = options._frozenColors;
    }

    setParentCommand(command) {
        this.parent = command;
        this._updateColors();
    }

    _updateColors() {
        if (hasColorsSupport && !this._frozenColors) {
            if (!this.parent.colors) {
                this.colors = this.parent.colors;
            } else {
                this.colors = util.assignDeep({}, this.parent.colors, this.colors);
            }
        }
    }

    get options() {
        const options = [];
        for (const group of this.optionsGroups) {
            options.push(...group.elements);
        }
        return options;
    }

    get commands() {
        const commands = [];
        for (const group of this.commandsGroups) {
            commands.push(...group.elements);
        }
        return commands;
    }

    hasArgument(argument) {
        for (const arg of this.arguments) {
            if (arg.match(argument)) {
                return true;
            }
        }
        return false;
    }

    addArgument(newArgument) {
        if (!(newArgument instanceof PositionalArgument)) {
            newArgument = new PositionalArgument(newArgument, this); // is this ok to pass the command here???
        }
        if (!newArgument.enabled) {
            return;
        }
        if (this.hasArgument(newArgument)) {
            throw new error.Exists(`${this.names[0]}: Argument with name ${newArgument.names[0]} is already exist`);
        }
        if (this.arguments.length > 0) {
            const last = this.arguments[this.arguments.length - 1];
            const nonRequiredMode = !last.required;
            if (nonRequiredMode && newArgument.required) {
                throw new error.IllegalState(`${this.names[0]}: non-default agrument must not follow default argument: ${last.names[0]} -> ${newArgument.names[0]}`);
            }
        }
        // newArgument.setCommand(this);
        this.arguments.push(newArgument);
    }

    hasOption(option) {
        for (const group of this.optionsGroups) {
            if (group.name === option.group) {
                return group.has(option);
            }
        }
        return false;
    }

    addOption(newOption) {
        if (!(newOption instanceof OptionalArgument)) {
            newOption = new OptionalArgument(newOption, this); // is this ok to pass the command here???
        }
        if (!newOption.enabled) {
            return;
        }
        if (this.hasOption(newOption)) {
            throw new error.Exists(`${this.names[0]}: Option with name ${newOption.names[0]} is already exist`);
        }
        if (this.blindMode && (newOption.nargs === "?" || newOption.nargs === "*")) {
            throw new error.IllegalState(`${this.names[0]}: Cannot use options with nargs = "*" | "+" | "?" it can lead to unexpected behaviour`);
        }
        for (const group of this.optionsGroups) {
            if (group.name === newOption.group) {
                group.add(newOption);
                // newOption.setCommand(this);
                return;
            }
        }
        throw new error.IllegalState(`${newOption.names[0]}: Cannot add the option; No such group: ${newOption.group}`);
    }

    hasOptionsGroup(group) {
        for (const grp of this.optionsGroups) {
            if (grp.name === group.name) {
                return true;
            }
        }
        return false;
    }

    addOptionsGroup(newGroup) {
        if (!(newGroup instanceof Group)) {
            newGroup = new Group(newGroup);
        }
        if (this.hasOptionsGroup(newGroup)) {
            throw new error.Exists(`${this.names[0]}: Options group with name ${newGroup.name} is already exist`);
        }
        const groups = this.optionsGroups;
        groups.push(newGroup);
        const len = groups.length;
        // keep the unnamed group at the end
        [groups[len - 1], groups[len - 2]] = [groups[len - 2], groups[len - 1]];
    }

    hasCommand(command) {
        for (const group of this.commandsGroups) {
            if (group.name === command.group) {
                return group.has(command);
            }
        }
        return false;
    }

    addCommand(newCommand) {
        if (!(newCommand instanceof Command)) {
            newCommand = new Command(newCommand, this);
        }
        if (this.hasCommand(newCommand)) {
            throw new error.Exists(`${this.names[0]}: Command with name ${newCommand.names[0]} is already exist`);
        }

        for (const group of this.commandsGroups) {
            if (group.name === newCommand.group) {
                group.add(newCommand);
                newCommand.setParentCommand(this);
                return;
            }
        }
        throw new error.IllegalState(`${newCommand.names[0]}: Cannot add the command; No such group: ${newCommand.group}`);
    }

    hasCommandsGroup(group) {
        for (const grp of this.commandsGroups) {
            if (grp.name === group.name) {
                return true;
            }
        }
        return false;
    }

    addCommandsGroup(newGroup) {
        if (!(newGroup instanceof Group)) {
            newGroup = new Group(newGroup);
        }
        if (this.hasOptionsGroup(newGroup)) {
            throw new error.Exists(`${this.names[0]}: Commands group with name ${newGroup.name} is already exist`);
        }
        const groups = this.commandsGroups;
        groups.push(newGroup);
        const len = groups.length;
        // keep the unnamed group at the end
        [groups[len - 1], groups[len - 2]] = [groups[len - 2], groups[len - 1]];
    }

    get subsystem() {
        if (is.subsystem(this._subsystem)) {
            return this._subsystem;
        }
        return this.parent.subsystem;
    }

    match(arg) {
        if (is.string(arg)) {
            if (this._match) {
                return this._match(arg) || false;
            }
            for (const name of this.names) {
                if (name === arg) {
                    return true;
                }
            }
            return false;
        }
        if (arg instanceof Command) {
            for (const name of arg.names) {
                if (this.match(name)) {
                    return true;
                }
            }
            return false;
        }
        throw new error.InvalidArgument();
    }

    getArgumentsMap() {
        return new ArgumentsMap(this.arguments);
    }

    getOptionsMap() {
        return new ArgumentsMap(this.options);
    }

    execute(rest, match) {
        return this.handler.call(this.subsystem, this.getArgumentsMap(), this.getOptionsMap(), {
            command: this,
            rest,
            match
        });
    }

    initializeWith(schema) {
        const options = this.constructor._postNormalize(this.names[0], schema, { postInit: true });
        if (options.handler !== adone.null) {
            this.handler = options.handler;
        }
        if (options.description !== adone.null) {
            this.description = options.description;
        }
        if (options.colors !== adone.null) {
            this.colors = options.colors;
            this._updateColors();
        }
        if (options.blindMode !== adone.null) {
            this.blindMode = options.blindMode;
        }
    }

    static _postNormalize(name, options, { postInit = false } = {}) {
        if (!("handler" in options)) {
            if (postInit) {
                options.handler = adone.null;
            } else {
                options.handler = (args, opts, { command }) => {
                    adone.log(escape(command.getHelpMessage()));
                    return 1;
                };
                options.handler[INTERNAL] = true;
            }
        } else if (!is.function(options.handler)) {
            throw new error.IllegalState(`${name}: A command handler must be a function`);
        }

        if (!is.string(options.description)) {
            if (is.string(options.help)) {
                options.description = options.help;
            } else {
                options.description = postInit ? adone.null : "";
            }
        }

        if (!options.group) {
            options.group = UNNAMED;
        }
        if (!options.match) {
            options.match = null;
        } else if (options.name.length > 1) {
            throw new error.IllegalState(`${name}: When match is set only one name is possible`);
        } else {
            if (is.regexp(options.match)) {
                const re = options.match;
                options.match = (x) => x.match(re);
            }
        }
        if (!hasColorsSupport) {
            options.colors = false;
        } else if (is.object(options.colors)) {
            if (!options.colors.inherit) {
                options.colors = util.assignDeep({}, defaultColors, options.colors);
                delete options.colors.inherit;
                options._frozenColors = true;
            }
        } else if (options.colors === false) {
            options._frozenColors = true;
        } else if (options.colors === "inherit") {
            options.colors = {};
        } else {
            if (postInit) {
                options.colors = adone.null;
            } else {
                options.colors = util.clone(defaultColors);
                options._frozenColors = true;
            }
        }
        if (postInit) {
            options.blindMode = "blindMode" in options
                ? Boolean(options.blindMode)
                : adone.null;
        } else {
            options.blindMode = Boolean(options.blindMode);
        }
        return options;
    }

    static normalize(options) {
        options = adone.o(options);
        if (!options.name) {
            throw new error.IllegalState("A command should have a name");
        }
        options.name = util.arrify(options.name);
        for (const name of options.name) {
            if (!is.string(name) || !name) {
                throw new error.IllegalState("A command name must be a non-empty string");
            }
        }
        return this._postNormalize(options.name[0], options);
    }

    getCommandChain() {
        if (this.parent) {
            return `${this.parent.getCommandChain()} ${this.names[0]}`;
        }
        return this.names[0];
    }

    getUsageMessage() {
        const chain = this.getCommandChain();
        const argumentsLength = term.stats.cols - chain.length - 1 - 4;
        const table = new text.table.BorderlessTable({
            colWidths: [4, chain.length + 1, argumentsLength]
        });
        const ellipsis = this.colors ? this.colors.ellipsis("...") : "...";
        const options = this.options;
        const internalOptions = options.filter((x) => x.internal);
        if (internalOptions.length !== 0) {
            for (const opt of internalOptions) {
                table.push([null, chain, opt.getUsageMessage({ required: false })]);
            }
        }
        const nonInternalOptions = options.filter((x) => !x.internal);
        const messages = [];
        for (const opt of nonInternalOptions) {
            messages.push(opt.getUsageMessage());
        }
        for (const arg of this.arguments) {
            messages.push(arg.getUsageMessage());
        }
        if (this.blindMode) {
            messages.push(ellipsis);
        }
        if (messages.length || !this.handler[INTERNAL]) {
            table.push([null, chain, argumentsWrap(messages, argumentsLength)]);
        }

        const commands = this.commands;
        if (commands.length !== 0) {
            // By groups
            for (const group of this.commandsGroups) {
                if (group.empty) {
                    continue;
                }
                const names = [...group].map((x) => x.getNamesMessage({ first: true }));
                table.push([null, chain, `${commandsWrap(names, argumentsLength, this.colors)} ${ellipsis}`]);
            }
        }
        let heading = table.length === 1 ? "Usage:" : "Usages:";
        if (this.colors) {
            heading = this.colors.usage(heading);
        }
        const message = `${heading}\n${table.toString()}`;
        if (!hasColorsSupport) {
            return text.stripAnsi(message);
        }
        return message;
    }

    getNamesMessage({ first = false } = {}) {
        const colors = this.parent && this.parent.colors;
        return (first ? this.names.slice(0, 1) : this.names).map((x) => {
            return colors ? colors.commandName(x) : x;
        }).join(", ");
    }

    getShortHelpMessage() {
        return this.colors ? this.colors.commandHelpMessage(this.description) : this.description;
    }

    getHelpMessage() {
        const helpMessage = [this.getUsageMessage()];

        const totalWidth = term.stats.cols;

        if (is.string(this.description) && this.description) {
            helpMessage.push("", text.wordwrap(this.description, totalWidth));
        }

        const commandHeading = (x) => {
            if (this.colors) {
                return this.colors.commandGroupHeading(x);
            }
            return x;
        };

        const argumentHeading = (x) => {
            if (this.colors) {
                return this.colors.argumentGroupHeading(x);
            }
            return x;
        };

        const optionHeading = (x) => {
            if (this.colors) {
                return this.colors.optionGroupHeading(x);
            }
            return x;
        };

        const options = this.options;
        const commands = this.commands;
        if (this.arguments.length || options.length || commands.length) {
            helpMessage.push("");
            if (this.arguments.length) {
                helpMessage.push(argumentHeading("Arguments:"));
                helpMessage.push(pretty.table(this.arguments.map((arg) => {
                    return {
                        names: arg.getNamesMessage(),
                        message: arg.getShortHelpMessage()
                    };
                }), {
                    model: [
                        { id: "left-spacing", width: 4 },
                        { id: "names", maxWidth: 40, wordwrap: true },
                        { id: "between-cells", width: 2 },
                        { id: "message", wordwrap: false }
                    ],
                    width: "100%",
                    borderless: true,
                    noHeader: true
                }));
            }
            if (options.length) {
                if (this.arguments.length) {
                    helpMessage.push("");
                }
                const nonEmptyGroups = this.optionsGroups.filter((x) => !x.empty);
                for (const [idx, group] of util.enumerate(nonEmptyGroups)) {
                    if (idx > 0) {
                        helpMessage.push("");
                    }
                    if (group.name === UNNAMED) {
                        if (options.length !== group.length) {
                            // we have not only unnamed options
                            helpMessage.push(optionHeading("Other options:"));
                        } else {
                            // we have only unnamed options
                            helpMessage.push(optionHeading("Options:"));
                        }
                    } else {
                        helpMessage.push(optionHeading(`${group.description}:`));
                    }

                    helpMessage.push(pretty.table([...group].map((opt) => {
                        return {
                            names: opt.getUsageMessage({ required: false, allNames: true }),
                            message: opt.getShortHelpMessage()
                        };
                    }), {
                        model: [
                            { id: "left-spacing", width: 4 },
                            { id: "names", maxWidth: 40, wordwrap: true },
                            { id: "between-cells", width: 2 },
                            { id: "message", wordwrap: true }
                        ],
                        width: "100%",
                        borderless: true,
                        noHeader: true
                    }));
                }
            }
            if (commands.length) {
                if (this.arguments.length || options.length) {
                    helpMessage.push("");
                }
                const nonEmptyGroups = this.commandsGroups.filter((x) => !x.empty);
                for (const [idx, group] of util.enumerate(nonEmptyGroups)) {
                    if (idx > 0) {
                        helpMessage.push("");
                    }
                    if (group.name === UNNAMED) {
                        if (commands.length !== group.length) {
                            // we have not only unnamed options
                            helpMessage.push(commandHeading("Other commands:"));
                        } else {
                            // we have only unnamed options
                            helpMessage.push(commandHeading("Commands:"));
                        }
                    } else {
                        helpMessage.push(commandHeading(`${group.description}:`));
                    }

                    helpMessage.push(pretty.table([...group].map((cmd) => {
                        return {
                            names: cmd.getNamesMessage(),
                            message: cmd.getShortHelpMessage()
                        };
                    }), {
                        model: [
                            { id: "left-spacing", width: 4 },
                            { id: "names", maxWidth: 40, wordwrap: true },
                            { id: "between-cells", width: 2 },
                            { id: "message", wordwrap: true }
                        ],
                        width: "100%",
                        borderless: true,
                        noHeader: true
                    }));
                }
            }
        }
        const message = helpMessage.join("\n");
        if (!hasColorsSupport) {
            return text.stripAnsi(message);
        }
        return message;
    }
}

const mergeGroupsLists = (a, b) => {
    const mapping = (x) => {
        if (!(x instanceof Group)) {
            x = new Group(x);
        } else {
            x = new Group({
                name: x.name,
                description: x.description
            });
        }
        return [x.name, x];
    };
    const aMap = new Map(a.map(mapping));
    const bMap = new Map(b.map(mapping));
    // add all the groups from b, it has preference
    const result = [...bMap.values()];
    for (const [name, group] of aMap.entries()) {
        // if b has such a group => skip it
        if (bMap.has(name)) {
            continue;
        }
        // no such group => add it
        result.push(group);
    }
    return result;
};

export default class CliApplication extends app.Application {
    constructor({ name, interactive, argv = process.argv.slice(2) } = {}) {
        super({ name, interactive });

        this.argv = argv;

        this[MAIN_COMMAND] = null;
        this[VERSION] = null;

        this.defineMainCommand();
    }

    /**
     * Returns main command.
     *
     * @returns {Command}
     */
    get mainCommand() {
        return this[MAIN_COMMAND];
    }

    exposeCliInterface(ctxId = "cli") {
        if (adone.runtime.netron.hasContext(ctxId)) {
            return;
        }

        adone.runtime.netron.attachContext(new CliContext(this), ctxId);
    }

    async _configure(ignoreArgs) {
        this[ERROR_SCOPE] = true;

        const sysMeta = reflect.getMetadata(SUBSYSTEM_ANNOTATION, this.constructor);
        if (sysMeta) {
            if (sysMeta.mainCommand) {
                this.defineMainCommand(sysMeta.mainCommand);
            }

            if (is.array(sysMeta.commandsGroups)) {
                for (const group of sysMeta.commandsGroups) {
                    this.defineCommandsGroup(group);
                }
            }

            if (is.array(sysMeta.optionsGroups)) {
                for (const group of sysMeta.optionsGroups) {
                    this.defineOptionsGroup(group);
                }
            }
        }

        await super._configure();

        if (sysMeta) {
            if (is.array(sysMeta.commands)) {
                for (const command of sysMeta.commands) {
                    this.defineCommand(command);
                }
            }

            if (is.array(sysMeta.options)) {
                for (const option of sysMeta.options) {
                    this.defineOption(option);
                }
            }

            if (is.array(sysMeta.subsystems)) {
                for (const ss of sysMeta.subsystems) {
                    // eslint-disable-next-line
                    await this.defineCommandFromSubsystem({
                        ...ss,
                        lazily: true
                    });
                }
            }
        }

        this[ERROR_SCOPE] = false;

        let command = this[MAIN_COMMAND];
        let errors = [];
        let rest = [];
        let match = null;
        if (!ignoreArgs) {
            ({ command, errors, rest, match } = await this._parseArgs(this.argv));
        }

        if (errors.length) {
            adone.log(`${escape(command.getUsageMessage())}\n`);
            for (const error of errors) {
                adone.log(escape(error.message));
            }
            await this.exit(app.EXIT_ERROR);
        }

        return [command, match, rest];
    }

    main() {
        // print usage message by default
        adone.log(`${escape(this[MAIN_COMMAND].getHelpMessage())}\n`);
        return EXIT_SUCCESS;
    }

    async run({ ignoreArgs = false } = {}) {
        try {
            if (is.null(adone.runtime.app)) {
                await this._setupMain();
                this.exitOnSignal("SIGINT");
            }

            const [command, match, rest] = await this._configure(ignoreArgs);

            this[ERROR_SCOPE] = true;
            await this._initialize();

            await this.emitParallel("before run", command);
            const code = await command.execute(rest, match);
            this[ERROR_SCOPE] = false;
            if (is.integer(code)) {
                await this.exit(code);
                return;
            }
            await this.setState(STATE.RUNNING);
        } catch (err) {
            if (this[ERROR_SCOPE]) {
                return this._fireException(err);
            }
            adone.logError(err.stack || err.message || err);
            return this.exit(app.EXIT_ERROR);
        }
    }

    async getVersion() {
        if (!is.null(this[VERSION])) {
            return this[VERSION];
        }
        let currentPath = __dirname;
        for (; ;) {
            const packagePath = std.path.join(currentPath, "package.json");
            try {
                // eslint-disable-next-line
                const data = JSON.parse(await adone.fs.readFile(packagePath));
                return this[VERSION] = data.version;
            } catch (err) {
                //
            }
            const nextPath = std.path.dirname(currentPath);
            if (currentPath === nextPath) { // that was the root
                break;
            }
            currentPath = nextPath;
        }
        return this[VERSION] = undefined;
    }

    defineMainCommand(options) {
        options = adone.o({
            name: this.name,
            handler: (args, opts, meta) => this.main(args, opts, meta),
            options: [],
            arguments: [],
            commands: [],
            commandsGroups: [],
            optionsGroups: [],
            colors: "default"
        }, options);

        options.handler[INTERNAL] = this.main[INTERNAL];

        if (!hasColorsSupport) {
            options.colors = false;
        }

        if (options.addVersion !== false) {
            options.options.unshift({
                name: "--version",
                help: "Show the version",
                handler: async () => {
                    adone.log(escape(await this.getVersion()));
                    return 0;
                },
                [INTERNAL]: true
            });
        }
        this[MAIN_COMMAND] = this._createCommand(options, null);
        this[MAIN_COMMAND]._subsystem = this;
        return this;
    }

    _createCommand(schema, parent) {
        const command = new Command(util.pick(schema, [
            "name",
            "help",
            "description",
            "loader",
            "handler",
            "group",
            "match",
            "colors",
            "blindMode"
        ]));

        if (parent) {
            parent.addCommand(command);
        }

        this._initCommand(command, schema, { addHelp: true, initialized: true });
        return command;
    }

    _initCommand(command, schema, { addHelp, initialized }) {
        if (!initialized) {
            command.initializeWith(schema);
        }

        if (schema.arguments) {
            for (const arg of schema.arguments) {
                command.addArgument(arg);
            }
        }

        if (schema.optionsGroups) {
            for (const group of schema.optionsGroups) {
                command.addOptionsGroup(group);
            }
        }

        const options = schema.options ? schema.options.slice() : [];
        if (addHelp) {
            options.unshift({
                name: ["--help", "-h"],
                help: "Show this message",
                handler: (_, cmd) => {
                    adone.log(escape(cmd.getHelpMessage()));
                    return 0;
                },
                [INTERNAL]: true
            });
        }
        for (const opts of options) {
            command.addOption(opts);
        }

        if (schema.commandsGroups) {
            for (const group of schema.commandsGroups) {
                command.addCommandsGroup(group);
            }
        }

        if (schema.commands) {
            for (const subCmdParams of schema.commands) {
                this._createCommand(subCmdParams, command);
            }
        }
    }

    _getCommand(chain, create = false) {
        let cmd = this[MAIN_COMMAND];
        for (let i = 0; i < chain.length; ++i) {
            const name = chain[i];
            let subcmd;
            for (const c of cmd.commands) {
                if (c.match(name)) {
                    subcmd = c;
                    break;
                }
            }
            if (is.undefined(subcmd)) {
                if (create) {
                    subcmd = this._createCommand({ name }, cmd);
                } else {
                    throw new error.NotExists(`No such command: ${chain.slice(0, i + 1).join(" ")}`);
                }
            }
            cmd = subcmd;
        }
        return cmd;
    }

    defineArguments(options = {}) {
        const mainOptionsGroups = this[MAIN_COMMAND].optionsGroups
            .filter((x) => x.name !== UNNAMED)
            .map((x) => ({ name: x.name, description: x.description }));
        const mainCommandsGroups = this[MAIN_COMMAND].commandsGroups
            .filter((x) => x.name !== UNNAMED)
            .map((x) => ({ name: x.name, description: x.description }));
        const optionsGroups = options.optionsGroups ? options.optionsGroups.map((x) => {
            const group = new Group(x);
            return { name: group.name, description: group.description };
        }) : [];
        const commandsGroups = options.commandsGroups ? options.commandsGroups.map((x) => {
            const group = new Group(x);
            return { name: group.name, description: group.description };
        }) : [];
        options.commandsGroups = mergeGroupsLists(mainCommandsGroups, commandsGroups);
        options.optionsGroups = mergeGroupsLists(mainOptionsGroups, optionsGroups);
        this.defineMainCommand(options);
    }

    defineCommand(subsystem, cmdParams) {
        // defineCommand(subsustem, opts)
        // or
        // defineCommand(opts)
        if (!is.subsystem(subsystem)) {
            cmdParams = subsystem;
            subsystem = null;
        }

        if (!is.object(cmdParams)) {
            throw new error.InvalidArgument("The options must be an object");
        }

        if (subsystem) {
            const command = subsystem[COMMAND];
            if (command instanceof Command) {
                this._initCommand(command, cmdParams, { addHelp: false, initialized: false });
                command._subsystem = subsystem; // Set correct subsystem
                return;
            }
        }

        const newCommand = this._createCommand(cmdParams, this.mainCommand);
        newCommand._subsystem = subsystem;
        return newCommand;
    }

    async defineCommandFromSubsystem({
        name,
        description = "",
        group,
        subsystem,
        configureArgs = [],
        lazily = false,
        transpile = false
    } = {}) {
        if (lazily === true) {
            this.defineCommand({
                name,
                description,
                group,
                loader: () => this.addSubsystem({
                    subsystem,
                    name,
                    description,
                    group,
                    configureArgs,
                    transpile
                })
            });
        } else {
            subsystem = this.instantiateSubsystem(subsystem, { transpile });
            let sysMeta = reflect.getMetadata(SUBSYSTEM_ANNOTATION, subsystem.constructor);
            if (sysMeta) {
                sysMeta.name = sysMeta.name || name;
                sysMeta.description = sysMeta.description || description;
                sysMeta.group = sysMeta.group || group;
            } else {
                sysMeta = {
                    name,
                    description,
                    group
                };
            }

            this.addSubsystem({ subsystem, name, description, group, configureArgs, transpile });
            this._defineCommandFromSubsystem(subsystem, sysMeta);
        }
    }

    _defineCommandFromSubsystem(subsystem, sysMeta, props) {
        const commands = util.arrify(sysMeta.commands);
        if (is.array(sysMeta.subsystems)) {
            for (const ss of sysMeta.subsystems) {
                commands.push({
                    ...util.pick(ss, ["name", "description", "group"]),
                    loader: () => subsystem.addSubsystem(ss) // eslint-disable-line
                });
            }
        }
        const params = is.array(props) ? util.pick(sysMeta, props) : sysMeta;
        this.defineCommand(subsystem, {
            ...params,
            commands
        });
    }

    defineOption(optParams) {
        const cmd = this.mainCommand;
        const option = new OptionalArgument(optParams, cmd); // weird
        if (!option.enabled) {
            return;
        }
        cmd.addOption(option);
    }

    defineOptionsGroup(groupParams) {
        this.mainCommand.addOptionsGroup(groupParams);
    }

    defineCommandsGroup(groupParams) {
        this.mainCommand.addCommandsGroup(groupParams);
    }

    /**
     * get an option of a particular command
     * path must be a dot splitted string
     */
    option(path, { value = true } = {}) {
        const parts = path.split(".");
        const optionName = parts.pop();
        let cmd = this[MAIN_COMMAND];
        nextPart: for (let i = 0; i < parts.length; ++i) {
            for (const subcmd of cmd.commands) {
                if (subcmd.match(parts[i])) {
                    cmd = subcmd;
                    continue nextPart;
                }
            }
            throw new error.Unknown(`Unknown command ${parts.slice(0, i).join(".")}`);
        }
        for (const option of cmd.options) {
            const names = option.names.map((x) => {
                let i = 0;
                while (x[i] === "-") {
                    ++i;
                }
                return x.slice(i);
            });
            names.push(...names.map((x) => text.toCamelCase(x)));
            if (names.includes(optionName)) {
                return value ? option.value : option;
            }
        }
        throw new error.NotExists(`${cmd.names[0]} doesnt have this option: ${optionName}`);
    }

    async _parseArgs(_argv) {
        let optional = null;
        let positional = null;
        let commands = null;

        let command = this[MAIN_COMMAND];
        let match = this[MAIN_COMMAND].names[0];
        let argument = null;

        let finished = false;
        const errors = [];
        const argv = [];
        let hasStopMark = false;
        for (const part of _argv) {
            if (part === "-") {
                throw new error.IllegalState('We do not handle "-" yet');
            }
            if (part === "--") {
                // a special case where we have to stop the parsing process
                hasStopMark = true;
            }
            // check if it is --smth=VALUE or -smth=VALUE
            if (!hasStopMark && /^--?[^\s]+?=/.test(part)) {
                const index = part.indexOf("=");
                argv.push(part.slice(0, index)); // --smth
                argv.push(part.slice(index + 1)); // VALUE, can be empty, ok? --opt="" or --opt=
                // all the quotes must be handled by the shell, ok?
            } else {
                argv.push(part);
            }
        }
        const rest = [];
        try {
            let part = null;
            let partIndex = -1;


            const isNegativeNumber = (str) => /^-\d+.?\d*$/.test(str);

            const nextPart = () => {
                part = argv[++partIndex];
            };
            const unshiftPart = () => {
                part = argv[partIndex--];
            };
            nextPart();
            let numberOfPositionalArgs = 0;

            const state = ["start command"];

            next: for (; !finished;) {
                let remaining = argv.length - 1 - partIndex;
                switch (state.shift()) {
                    case "start command": {
                        positional = command.arguments.slice();
                        numberOfPositionalArgs = positional.length;
                        optional = command.options.slice();
                        commands = command.commands.slice();
                        state.push("next argument");
                        break;
                    }
                    case "next argument": {
                        if (command.blindMode && numberOfPositionalArgs !== 0 && positional.length === 0) {
                            unshiftPart();
                            state.push("rest");
                            state.push("finish");
                            continue next;
                        }
                        // if no element => exit
                        if (remaining < 0) {
                            state.push("finish");
                            continue next;
                        }
                        if (part === "--") {
                            // a special case where we have to stop the parsing process
                            state.push("rest");
                            state.push("finish");
                            continue next;
                        }
                        // first try commands
                        for (let j = 0; j < commands.length; ++j) {
                            const commandMatch = commands[j].match(part);
                            if (commandMatch !== false) {
                                match = commandMatch;
                                command = commands[j];
                                if (is.function(command.loader)) {
                                    // We have lazy loaded subsystem, try load it and reinit command
                                    const sysInfo = await command.loader.call(command.subsystem); // eslint-disable-line
                                    sysInfo.instance[COMMAND] = command;
                                    await this._configureSubsystem(sysInfo); // eslint-disable-line

                                    // Check for meta data and if exists define sub commands, ...
                                    const sysMeta = reflect.getMetadata(SUBSYSTEM_ANNOTATION, sysInfo.instance.constructor);
                                    if (sysMeta) {
                                        this._defineCommandFromSubsystem(sysInfo.instance, sysMeta, [
                                            "description", // ??
                                            "help", // ??
                                            "match",
                                            "colors",
                                            "blindMode",
                                            "optionsGroups",
                                            "commandsGroups",
                                            "arguments",
                                            "options",
                                            "handler"
                                        ]);
                                    }
                                }
                                state.push("start command");
                                nextPart();
                                continue next;
                            }
                        }
                        // optional arguments

                        let matches = false;
                        // all the options starts with "-"
                        if (part[0] === "-") {
                            if (part[1] !== "-" && part.length > 2) {
                                // in this case we try to split composite options
                                // -abc -> -a -b -c
                                // by splittable we mean short boolean options, i.e. that have a short name alias (-x) and exactly 0 arguments
                                // first of all there must not be an exact match for the whole option, i.e. -abc
                                // and there must be an argument for each suboption, i.e. for -a, -b and -c
                                const exactMatch = optional.some((arg) => arg.match(part)); // eslint-disable-line
                                const splittable = !exactMatch && [...part.slice(1)].every((opt) => { // eslint-disable-line
                                    for (let k = 0; k < optional.length; ++k) {
                                        const arg = optional[k];
                                        if (arg.match(`-${opt}`)) {
                                            if (arg.nargs !== 0) {
                                                // fatal error, stop parsing
                                                throw new error.IllegalState(`Options with arguments cannot be grouped: -${opt}`);
                                            }
                                            return true;
                                        }
                                    }
                                    return false;
                                });
                                if (splittable) {
                                    argv.splice(partIndex, 1, ...[...part.slice(1)].map((x) => `-${x}`));
                                    // the part splits into part.length - 1 parts
                                    remaining += part.length - 2; // the current part has been counted
                                    part = part.slice(0, 2);
                                }
                            }
                            for (let j = 0; j < optional.length; ++j) {
                                if (optional[j].match(part)) {
                                    argument = optional[j];
                                    if (argument.action !== "append" && argument.action !== "count") {
                                        optional.splice(j, 1);
                                    }
                                    matches = true;
                                    break;
                                }
                            }
                            if (!matches) {
                                // may be it is a negative number?
                                if (!isNegativeNumber(part)) {
                                    // not a negative number
                                    errors.push(new error.IllegalState(`unknown option: ${part}`));
                                    state.push("next argument");
                                    nextPart();
                                    continue;
                                }
                            }
                        }
                        // doesnt match any optional
                        // try positional
                        if (!matches && positional.length) {
                            argument = positional.shift();
                            matches = true;
                        }
                        if (matches) {
                            argument.present = true;
                            if ((is.integer(argument.nargs) && argument.nargs > 0) || argument.nargs === "*" || argument.nargs === "+" || argument.nargs === "?") {
                                if (argument.nargs !== 0) {
                                    argument.value = [];
                                }
                                state.push("fetch params");
                            } else {
                                // mustnt have an explicit value
                                switch (argument.action) {
                                    case "store_true":
                                        argument.value = true;
                                        break;
                                    case "store_false":
                                        argument.value = false;
                                        break;
                                    case "store_const":
                                        argument.value = argument.const;
                                        break;
                                    case "count":
                                        ++argument.value;
                                        break;
                                    default:
                                        argument.value = argument.default;
                                }
                                state.push("finish argument");
                            }
                            if (argument.optional) {
                                nextPart();
                            } // current part is a parameter if the argument is positional
                            continue next;
                        }
                        // doesnt match anything
                        state.push("finish");
                        break;
                    }
                    case "fetch params": {
                        // if we have no more elements => exit
                        if (remaining < 0) {
                            state.push("finish argument");
                            continue next;
                        }

                        if (part === "--") {
                            // a special case where we have to stop the parsing process
                            state.push("finish argument");
                            state.push("rest");
                            continue next;
                        }

                        // may be it is a command?
                        for (const cmd of commands) {
                            if (cmd.match(part)) {
                                state.push("finish argument");
                                continue next;
                            }
                        }
                        // check if it matches some optional arg
                        if (part[0] === "-") {
                            for (const arg of optional) {
                                if (arg.match(part)) {
                                    state.push("finish argument");
                                    continue next;
                                }
                            }
                            if (!isNegativeNumber(part)) {
                                errors.push(new error.IllegalState(`unknown option: ${part}`));
                                nextPart();
                                state.push("finish argument");
                                continue next;
                            }
                        }
                        // doesnt match anything

                        // look how many possible positional values
                        let possible = 0;
                        possible: for (let j = partIndex + 1; j < argv.length; ++j) {
                            for (const arg of optional) {
                                if (arg.match(argv[j])) {
                                    continue possible; // calc n of required args
                                }
                            }
                            for (const cmd of commands) {
                                if (cmd.match(argv[j])) {
                                    break possible;
                                }
                            }
                            ++possible;
                        }

                        // calculate how many arguments needed for other positional params or some required optional params
                        let atLeast = 0;
                        for (const _ of [positional, optional]) {
                            for (const arg of _) {
                                if (!arg.required) {
                                    continue;
                                }
                                const { nargs } = arg;
                                if (is.integer(nargs)) {
                                    atLeast += nargs;
                                } else if (nargs === "+") {
                                    ++atLeast;
                                }
                            }
                        }

                        let thisAtLeast = 0;
                        if (argument.required || argument.optional) { // optional was passed, have to calculate
                            const { nargs } = argument;
                            const hasValue = argument.hasValue();
                            if (is.integer(nargs)) {
                                if (hasValue) {
                                    thisAtLeast += nargs - argument.value.length;
                                } else {
                                    thisAtLeast += nargs;
                                }
                            } else if (nargs === "+" && argument.value.length === 0) {
                                ++thisAtLeast;
                            }
                        }
                        if (atLeast >= possible + 1 && thisAtLeast === 0) {
                            // we have only required elements left and this argument doesnt require more
                            state.push("finish argument");
                            continue next;
                        }

                        let value;
                        try {
                            // eslint-disable-next-line no-await-in-loop
                            value = await argument.coerce(part);
                        } catch (err) {
                            err.message = `${argument.names[0]}: ${err.message}`;
                            errors.push(err);
                            if (err.fatal) {
                                break next;
                            }
                            state.push("finish argument");
                            nextPart();
                            continue next;
                        }
                        if (argument.choices && !argument.choices.includes(value)) {
                            errors.push(new error.IllegalState(`${argument.names[0]}: invalid choice "${value}" (choose from ${argument.choices.map((x) => `"${x}"`).join(", ")})`));
                            state.push("finish argument");
                            nextPart();
                            continue next;
                        }
                        argument.value.push(value);
                        nextPart();

                        if (
                            argument.nargs === "?" || // it requires 1 value and it has got it
                            (atLeast >= possible && thisAtLeast === 0) ||
                            (is.integer(argument.nargs) && argument.value.length === argument.nargs)
                        ) {
                            // it can be enough for this argument or we have only required elements left
                            state.push("finish argument");
                        } else {
                            state.push("fetch params");
                        }
                        break;
                    }
                    case "finish argument": {
                        if (is.integer(argument.nargs)) {
                            if (argument.nargs > 0 && !argument.hasValue()) {
                                errors.push(new error.IllegalState(`${argument.names[0]}: must have a value`));
                            }
                            if (argument.action === "store" && argument.value.length !== argument.nargs) {
                                errors.push(new error.IllegalState(`${argument.names[0]}: has not enough parameters, ${argument.value.length} of ${argument.nargs}`));
                            }
                            if (argument.nargs === 1) {
                                argument.value = argument.value[0];
                            }
                        } else if (argument.nargs === "+") {
                            if (argument.value.length === 0) {
                                errors.push(new error.IllegalState(`${argument.names[0]}: has not enough parameters, must have at least 1`));
                            }
                        } else if (argument.nargs === "?") {
                            if (argument.value.length) {
                                argument.value = argument.value[0];
                            } else {
                                argument.value = argument.default;
                            }
                        }
                        if (argument.action === "append") {
                            if (!argument._values) {
                                argument._values = [];
                            }
                            argument._values.push(argument.value);
                        }
                        if (argument.action === "set") {
                            const totalNum = util.unique(argument.value).length;
                            argument.value = argument.choices.reduce((x, y) => { // eslint-disable-line
                                x[y] = argument.set(argument.value.includes(y), y, totalNum);
                                return x;
                            }, {});
                        }
                        if (argument.optional) {
                            // eslint-disable-next-line no-await-in-loop
                            const res = await argument.handler.call(
                                command.subsystem/*this*/,
                                argument.value,
                                command
                            );
                            if (is.integer(res)) {
                                return this.exit(res);
                            }
                        }
                        state.push("next argument");
                        break;
                    }
                    case "finish": {
                        if (remaining >= 0) { // it should be -1 if there are no elements, so we have extra args, weird
                            errors.push(new error.IllegalState(`unknown parameter: ${part}`));
                        }
                        finished = true;
                        // check required arguments
                        for (const arg of positional) {
                            if (!arg.present) {
                                if (arg.action === "set") {
                                    arg.value = arg.choices.reduce((x, y) => {
                                        x[y] = arg.set(false, y, 0);
                                        return x;
                                    }, {});
                                } else if (arg.nargs === "*" || arg.nargs === "?" || !arg.required) {
                                    arg.value = arg.default;
                                } else if (arg.nargs === "+") {
                                    errors.push(new error.IllegalState(`${arg.names[0]}: has not enough parameters, must have at least 1`));
                                } else if (is.integer(arg.nargs)) {
                                    errors.push(new error.IllegalState(`${arg.names[0]}: has not enough parameters, must have ${arg.nargs}`));
                                }
                            }
                        }
                        // should check if there are required optional arguments werent provided
                        for (const arg of optional) {
                            if (!arg.present) {
                                const { nargs } = arg;
                                if (arg.required) {
                                    errors.push(new error.IllegalState(`${arg.names[0]}: must be provided`));
                                } else if (
                                    arg.action === "append" ||
                                    nargs === "+" ||
                                    nargs === "*" ||
                                    nargs === "?" ||
                                    nargs > 1
                                ) {
                                    arg.value = arg.default;
                                }
                            } else if (arg.action === "append") {
                                arg.value = arg._values;
                            }
                        }
                        for (const arg of [...command.arguments, ...command.options]) {
                            if (arg.present && arg.hasVerifier()) {
                                // eslint-disable-next-line no-await-in-loop
                                await arg.verify(command.getArgumentsMap(), command.getOptionsMap());
                            }
                        }
                        break;
                    }
                    case "rest": {
                        for (; ;) {
                            nextPart();
                            if (is.undefined(part)) {
                                break;
                            }
                            rest.push(part);
                        }
                    }
                }
            }
        } catch (err) {
            errors.push(err);
        }
        return { command, errors, rest, match };
    }
}
tag.add(CliApplication, "CLI_APPLICATION");

// mark the default main as internal to be able to distinguish internal from user-defined handlers
CliApplication.prototype.main[INTERNAL] = true;


// CliApplication.Argument = Argument;
// CliApplication.PositionalArgument = PositionalArgument;
// CliApplication.OptionalArgument = OptionalArgument;
// CliApplication.Command = Command;
