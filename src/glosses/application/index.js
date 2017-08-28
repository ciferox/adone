const {
    is,
    x,
    fs,
    std,
    text,
    lazify,
    util,
    terminal,
    tag
} = adone;

const lazy = lazify({
    report: "./report"
}, exports, require);

const noStyleLength = (x) => text.ansi.stripEscapeCodes(x).length;

const hasColorsSupport = Boolean(process.stdout.isTTY);

const defaultColors = {
    commandName: (x) => terminal.parse(`{#4CAF50-fg}${x}{/}`),
    commandHelpMessage: (x) => terminal.italic.italic(x),
    commandSeparator: (x) => x,
    optionName: (x) => terminal.parse(`{#00B0FF-fg}${x}{/}`),
    optionVariable: (x) => x,
    optionHelpMessage: (x) => terminal.italic.italic(x),
    // argumentName: (x) => x,
    argumentName: (x) => terminal.parse(`{#F44336-fg}${x}{/}`),
    argumentHelpMessage: (x) => terminal.italic(x),
    default: (x) => terminal.grey(x),
    // angleBracket: (x) => terminal.green(x),
    angleBracket: (x) => terminal.parse(`{#F44336-fg}${x}{/}`),
    squareBracket: (x) => terminal.yellow(x),
    curlyBracket: (x) => terminal.yellow(x),
    ellipsis: (x) => terminal.dim(x),
    usage: (x) => terminal.underline(x),
    commandGroupHeading: (x) => terminal.underline(x),
    argumentGroupHeading: (x) => terminal.underline(x),
    optionGroupHeading: (x) => terminal.underline(x),
    value: {
        string: (x) => terminal.green(x),
        null: (x) => terminal.yellow(x),
        number: (x) => terminal.yellow(x),
        undefined: (x) => terminal.yellow(x),
        boolean: (x) => terminal.yellow(x),
        object: {
            key: (x) => x,
            separator: (x) => terminal.cyan(x)
        }
    }
};

const INTERNAL = Symbol.for("adone:application:internal");
const UNNAMED = Symbol.for("adone:application:unnamed");
const EMPTY_VALUE = Symbol.for("adone:application:emptyValue");
const COMMAND = Symbol.for("adone:application:command");
const INTERACTIVE = Symbol.for("adone:application:interactive");
const REPORT = Symbol.for("adone:application:report");
const ERROR_SCOPE = Symbol.for("adone:application:errorScope");
const EXITING = Symbol.for("adone:application:exiting");
const IS_MAIN = Symbol.for("adone:application:isMain");
const MAIN_COMMAND = Symbol.for("adone:application:mainCommand");
const SUBSYSTEMS = Symbol.for("adone:application:subsystems");
const VERSION = Symbol.for("adone:application:version");
const HANDLERS = Symbol.for("adone:application:handlers");


const escape = (x) => x.replace(/%/g, "%%");

class Argument {
    constructor(options = {}) {
        options = Argument.normalize(options);

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
        if (this.action === "store_true") {
            return false;
        }
        if (this.action === "store_false") {
            return true;
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
                    const err = new x.Exception(`Incorrect value, must match ${type}`);
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

    hasValue() {
        return this._value !== EMPTY_VALUE;
    }

    hasDefaultValue() {
        if (
            this.action === "store_true" ||
            this.action === "store_false" ||
            this.action === "store_const" ||
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
        throw new x.InvalidArgument();
    }

    get positional() {
        throw new x.NotImplemented();
    }

    get optional() {
        throw new x.NotImplemented();
    }

    static normalize(options) {
        if (is.string(options)) {
            options = { name: options };
        } else {
            options = adone.o(options);
        }
        if (!options.name || options.name.length === 0) {
            throw new x.IllegalState("An argument should have a name");
        }
        options.name = adone.util.arrify(options.name);

        const [name] = options.name;
        if (options.action) {
            if (!["store", "store_const", "store_true", "store_false", "append", "count"].includes(options.action)) {
                throw new x.InvalidArgument(`${name}: action should be one of [store, store_const, store_true, store_false, append, append_const, count]`);
            }
            switch (options.action) {
                case "store_true":
                case "store_false":
                case "store_const":
                case "count":
                    if (options.choices) {
                        throw new x.InvalidArgument(`${name}: cannot use choices with action ${options.action}`);
                    }
                    if ("nargs" in options && options.nargs !== 0) {
                        throw new x.InvalidArgument(`${name}: nargs should be 0 for ${options.action}`);
                    } else {
                        options.nargs = 0;
                    }
                    break;
                case "store":
                case "append":
                    if ("nargs" in options) {
                        if (is.integer(options.nargs)) {
                            if (options.nargs < 1) {
                                throw new x.InvalidArgument(`${name}: nargs should be a positive integer for ${options.action}`);
                            }
                        } else if (!["*", "+", "?"].includes(options.nargs)) {
                            throw new x.InvalidArgument(`${name}: nargs should be a positive integer or one of [+, *, ?]`);
                        }
                    } else {
                        options.nargs = 1;
                    }
                    break;
            }
        } else if (options.nargs) {
            if ((is.integer(options.nargs) && options.nargs < 1) || (!is.integer(options.nargs) && !["+", "*", "?"].includes(options.nargs))) {
                throw new x.InvalidArgument(`${name}: nargs should be a positive integer or one of [+, *, ?]`);
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
                throw new x.InvalidArgument(`${name}: Using the variadic nargs with a list of types is ambiguous`);
            }
            if (is.integer(options.nargs) && options.nargs !== options.type.length) {
                throw new x.IllegalState(`${name}: The number of types must be equal to the number of arguments`);
            }
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
            if (/\s/.test(options.holder)) {
                throw new x.IllegalState(`${name}: holder cannot have space characters: ${options.holder}`);
            }
        } else {
            options.holder = null;
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

        return options;
    }

    _formatValue(x) {
        const type = adone.util.typeOf(x);

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
        if ("action" in options && options.action !== "store") {
            throw new x.IllegalState(`${this.names[0]}: A positional agrument must have action = store`);
        }
        if (this.names.length > 1) {
            throw new x.IllegalState(`${this.names[0]}: A positional argument cannot have multiple names`);
        }
        if (this.names[0][0] === "-") {
            throw new x.IllegalState(`${this.names[0]}: The name of a positional argument cannot start with "-"`);
        }
    }

    get positional() {
        return true;
    }

    get optional() {
        return false;
    }

    get usageVariable() {
        if (this.holder) {
            return this.holder;
        }
        return this.names[0];
    }

    getUsageMessage() {
        const uaOpenBracket = this.colors ? this.colors.angleBracket("<") : "<";
        const uaCloseBracket = this.colors ? this.colors.angleBracket(">") : ">";
        const openBracket = this.colors ? this.colors.squareBracket("[") : "[";
        const closeBracket = this.colors ? this.colors.squareBracket("]") : "]";
        const ellipsis = this.colors ? this.colors.ellipsis("...") : "...";
        let usageVariable = this.usageVariable;
        if (this.colors) {
            usageVariable = this.colors.argumentName(usageVariable);
        }
        const arg = `${uaOpenBracket}${usageVariable}${uaCloseBracket}`;
        let msg = null;
        if (this.nargs === "+") {
            msg = `${arg} ${openBracket}${arg} ${ellipsis}${closeBracket}`;
        } else if (this.nargs === "*") {
            msg = `${openBracket}${arg} ${ellipsis}${closeBracket}`;
        } else if (this.nargs === "?") {
            msg = `${openBracket}${arg}${closeBracket}`;
        } else if (is.integer(this.nargs)) {
            msg = `${arg} `.repeat(this.nargs - 1);
            msg = `${msg}${arg}`;
        }
        return msg;
    }

    _help() {
        return this.colors ? this.colors.argumentHelpMessage(this.description) : this.description;
    }

    getNamesMessage() {
        if (this.holder) {
            return this.colors ? this.colors.argumentName(this.holder) : this.holder;
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
                throw new x.IllegalState(`${this.names[0]}: The name of an optional argument must start with "-": ${name}`);
            }
            if (/\s/.test(name)) {
                throw new x.IllegalState(`${this.names[0]}: The name of an optional argument cannot have space characters: ${name}`);
            }
            if (/^-+$/.test(name)) {
                throw new x.IllegalState(`${this.names[0]}: The name of an optional argument must have a name: ${name}`);
            }
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

    get usageVariable() {
        if (this.holder) {
            return this.holder;
        }

        const s = this.names[0].toUpperCase();
        let i = 0;
        while (s[i] === "-") {
            ++i;
        }
        return s.slice(i);
    }

    getUsageMessage({ required = true, allNames = false } = {}) {
        let msg = (allNames ? this.names : this.names.slice(0, 1)).map((x) => {
            return this.colors ? this.colors.optionName(x) : x;
        }).join(", ");

        const openBrace = this.colors ? this.colors.squareBracket("[") : "[";
        const closeBrace = this.colors ? this.colors.squareBracket("]") : "]";
        const ellipsis = this.colors ? this.colors.ellipsis("...") : "...";

        let usageVariable = this.usageVariable;

        if (this.colors) {
            usageVariable = this.colors.optionVariable(usageVariable);
        }

        if (this.nargs === "+") {
            msg = `${msg} ${usageVariable} ${openBrace}${usageVariable} ${ellipsis}${closeBrace}`;
        } else if (this.nargs === "*") {
            msg = `${msg} ${openBrace}${usageVariable} ${ellipsis}${closeBrace}`;
        } else if (this.nargs === "?") {
            msg = `${msg} ${openBrace}${usageVariable}${closeBrace}`;
        } else if (is.integer(this.nargs) && this.nargs) {
            const t = `${usageVariable} `.repeat(this.nargs - 1);
            msg = `${msg} ${t}${usageVariable}`;
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
            throw new x.Unknown(`No such argument: ${key}`);
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
            throw new x.Unknown(`No such argument: ${key}`);
        }
        const arg = this.args.get(key);
        return arg.present;
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
            newArgument = new PositionalArgument(newArgument);
        }
        if (this.hasArgument(newArgument)) {
            throw new x.IllegalState(`${this.names[0]}: Cannot add the argument ${newArgument.names[0]} due to name collision`);
        }
        if (this.arguments.length > 0) {
            const last = this.arguments[this.arguments.length - 1];
            const nonRequiredMode = !last.required;
            if (nonRequiredMode && newArgument.required) {
                throw new x.IllegalState(`${this.names[0]}: non-default agrument must not follow default argument: ${last.names[0]} -> ${newArgument.names[0]}`);
            }
        }
        newArgument.setCommand(this);
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
            newOption = new OptionalArgument(newOption);
        }
        if (this.hasOption(newOption)) {
            throw new x.IllegalState(`${this.names[0]}: Cannot add the option ${newOption.names[0]} due to name collision`);
        }
        if (this.blindMode && (newOption.nargs === "?" || newOption.nargs === "*")) {
            throw new x.IllegalState(`${this.names[0]}: Cannot user options with nargs = "*" | "+" | "?" it can lead to unexpected behaviour`);
        }
        for (const group of this.optionsGroups) {
            if (group.name === newOption.group) {
                group.add(newOption);
                newOption.setCommand(this);
                return;
            }
        }
        throw new x.IllegalState(`${newOption.names[0]}: Cannot add the option; No such group: ${newOption.group}`);
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
            throw new x.IllegalState(`${this.names[0]}: Cannot add the options group ${newGroup.name} due to name collision`);
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
            throw new x.IllegalState(`${this.names[0]}: Cannot add the command ${newCommand.names[0]} due to name collision`);
        }
        for (const group of this.commandsGroups) {
            if (group.name === newCommand.group) {
                group.add(newCommand);
                newCommand.setParentCommand(this);
                return;
            }
        }
        throw new x.IllegalState(`${newCommand.names[0]}: Cannot add the command; No such group: ${newCommand.group}`);
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
            throw new x.IllegalState(`${this.names[0]}: Cannot add the options group ${newGroup.name} due to name collision`);
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
        throw new x.InvalidArgument();
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

    static normalize(options) {
        options = adone.o(options);
        if (!is.string(options.name)) {
            throw new x.IllegalState("A command should have a name");
        }
        options.name = adone.util.arrify(options.name);
        for (const name of options.name) {
            if (!is.string(name) || !name) {
                throw new x.IllegalState("A command name must be a non-empty string");
            }
        }
        if (!options.handler) {
            options.handler = (args, opts, { command }) => {
                adone.log(escape(command.getHelpMessage()));
            };
            options.handler[INTERNAL] = true;
        }

        if (!is.string(options.description)) {
            if (is.string(options.help)) {
                options.description = options.help;
            } else {
                options.description = "";
            }
        }

        if (!options.group) {
            options.group = UNNAMED;
        }
        if (!options.match) {
            options.match = null;
        } else if (options.name.length > 1) {
            throw new x.IllegalState("When match is set only one name is possible");
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
            options.colors = util.clone(defaultColors);
            options._frozenColors = true;
        }
        options.blindMode = Boolean(options.blindMode);
        return options;
    }

    getCommandChain() {
        if (this.parent) {
            return `${this.parent.getCommandChain()} ${this.names[0]}`;
        }
        return this.names[0];
    }

    getUsageMessage() {
        const chain = this.getCommandChain();
        const argumentsLength = terminal.cols - chain.length - 1 - 4;
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

        table.push([null, chain, argumentsWrap(messages, argumentsLength)]);

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
            return text.ansi.stripEscapeCodes(message);
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

        const totalWidth = terminal.cols;

        if (is.string(this.description)) {
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
                helpMessage.push(text.pretty.table(this.arguments.map((arg) => {
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
                for (const [idx, group] of adone.util.enumerate(this.optionsGroups)) {
                    if (group.empty) {
                        continue;
                    }
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

                    helpMessage.push(text.pretty.table([...group].map((opt) => {
                        return {
                            names: opt.getUsageMessage({ required: false, allNames: true }),
                            message: opt.getShortHelpMessage()
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
            }
            if (commands.length) {
                if (this.arguments.length || options.length) {
                    helpMessage.push("");
                }
                for (const [idx, group] of adone.util.enumerate(this.commandsGroups)) {
                    if (group.empty) {
                        continue;
                    }
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

                    helpMessage.push(text.pretty.table([...group].map((cmd) => {
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
            return text.ansi.stripEscapeCodes(message);
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


export class Subsystem extends adone.event.AsyncEmitter {
    constructor() {
        super();

        this.app = this;
        this._ = this.data = {};
    }

    configure() {
    }

    initialize() {
    }

    uninitialize() {
    }

    async reinitialize() {
        await this.uninitialize();
        await this.initialize();
    }

    defineCommand(...args) {
        return this.app.defineCommand(this, ...args);
    }
}
tag.set(Subsystem, tag.SUBSYSTEM);


export let instance = null; // eslint-disable-line

export class Application extends Subsystem {
    constructor({
        name = std.path.basename(process.argv[1], std.path.extname(process.argv[1])),
        interactive = true,
        argv = process.argv.slice(2) } = {}) {

        super();

        this.argv = argv;
        this.name = name;

        this[EXITING] = false;
        this[IS_MAIN] = false;
        this[MAIN_COMMAND] = null;
        this[HANDLERS] = null;
        this[ERROR_SCOPE] = false;
        this[VERSION] = null;
        this[REPORT] = null;
        this[INTERACTIVE] = interactive;
        
        this[SUBSYSTEMS] = [];

        this.setMaxListeners(Infinity);
        this.defineMainCommand();
    }

    get isMain() {
        return this[IS_MAIN];
    }

    _setupMain() {
        // setup the main application
        // Prevent double initialization of global application instance
        // (for cases where two or more Applications run in-process, the first app will be common).
        if (!is.null(instance)) {
            throw new x.IllegalState("It is impossible to have several main applications");
        }
        instance = this;

        if (process.env.ADONE_REPORT) {
            this.enableReport();
        }

        const uncaughtException = (...args) => this._uncaughtException(...args);
        const unhandledRejection = (...args) => this._unhandledRejection(...args);
        const rejectionHandled = (...args) => this._rejectionHandled(...args);
        const beforeExit = () => this.exit();
        const signalExit = (sigName) => this._signalExit(sigName);
        this[HANDLERS] = {
            uncaughtException,
            unhandledRejection,
            rejectionHandled,
            beforeExit,
            signalExit
        };
        process.on("uncaughtExectption", uncaughtException);
        process.on("unhandledRejection", unhandledRejection);
        process.on("rejectionHandled", rejectionHandled);
        process.on("beforeExit", beforeExit);
        this[IS_MAIN] = true;

        // Track cursor if interactive application (by default) and if tty mode
        if (this[INTERACTIVE] && terminal.output.isTTY) {
            return new Promise((resolve) => terminal.trackCursor(resolve));
        }
    }

    enableReport({
        events = process.env.ADONE_REPORT_EVENTS || "exception+fatalerror+signal+apicall",
        signal = process.env.ADONE_REPORT_SIGNAL,
        filename = process.env.ADONE_REPORT_FILENAME,
        directory = process.env.ADONE_REPORT_DIRECTORY
    } = {}) {
        this[REPORT] = lazy.report;
        if (events) {
            this[REPORT].setEvents(events);
        }
        if (signal) {
            this[REPORT].setSignal(signal);
        }
        if (filename) {
            this[REPORT].setFileName(filename);
        }
        if (directory) {
            this[REPORT].setDirectory(directory);
        }
    }

    reportEnabled() {
        return !is.null(this[REPORT]);
    }

    main() {
    }

    async run({ ignoreArgs = false } = {}) {
        try {
            if (is.null(instance)) {
                await this._setupMain();
            }

            this[ERROR_SCOPE] = true;
            await this.configure();
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
                return this.exit(Application.ERROR);
            }
            this[ERROR_SCOPE] = true;
            await this.initialize();
            const code = await command.execute(rest, match);
            this[ERROR_SCOPE] = false;
            if (is.integer(code)) {
                return this.exit(code);
            }
        } catch (err) {
            if (this[ERROR_SCOPE]) {
                return this._fireException(err);
            }
            adone.error(err.stack || err.message || err);
            return this.exit(Application.ERROR);
        }
    }

    /**
     * Adds cli subsystem. Depending on root-command associated cli subsystem will be loaded lazily.
     *
     * @param {{ name, description = "", group = "subsystem", path } = {}} ssConfig Subsystem object.
     * @returns {void}
     */
    useCliSubsystem({ name, description = "", group = "subsystem", path } = {}) {
        if (!is.string(name)) {
            throw new x.NotValid("Invalid name of subsystem");
        }

        if (!is.string(path)) {
            throw new x.NotValid("Invalid path of subsystem");
        }

        if (!std.path.isAbsolute(path)) {
            throw new x.NotValid("Path must be absolute");
        }

        this.defineCommand({
            name,
            description,
            group,
            loader: () => this.loadSubsystem({
                subsystem: path,
                initialize: false
            })
        });
    }

    /**
     * Adds cli subsystems.
     *
     * @param {*string|array<{ name, description, group, path }>} subsystems Absolute path with subsystems or list of subsystem descriptors
     */
    async useCliSubsystems(subsystems, { group = "subsystem" } = {}) {
        if (is.string(subsystems)) {
            if (!std.path.isAbsolute(subsystems)) {
                throw new x.NotValid("Path should be absolute");
            }
            const files = await fs.readdir(subsystems);
            for (const file of files) {
                const path = std.path.join(subsystems, file);
                if (await fs.is.directory(path)) { // eslint-disable-line
                    const adoneConfPath = std.path.join(path, "adone.conf.js");
                    if (await fs.exists(adoneConfPath)) { // eslint-disable-line
                        const adoneConf = adone.require(adoneConfPath);

                        this.useCliSubsystem({
                            name: adoneConf.name,
                            description: adoneConf.description,
                            group,
                            path
                        });
                    }
                }
            }
        } else if (is.array(subsystems)) {
            for (const ss of subsystems) {
                this.useCliSubsystem(Object.assign({}, ss, {
                    group
                }));
            }
        } else {
            throw new x.InvalidArgument("Argument should be a string or an array");
        }
    }

    /**
     * Loads subsystem from specified path.
     *
     * @param {string|adone.application.Subsystem} subsystem Subsystem instance or absolute path.
     * @returns {Promise<adone.application.Subsystem>}
     */
    async loadSubsystem({ subsystem, configure = true, initialize = true } = {}) {
        if (is.string(subsystem)) {
            let Subsystem = require(subsystem);
            if (Subsystem.__esModule === true) {
                Subsystem = Subsystem.default;
            }
            subsystem = new Subsystem();
        } else if (!is.subsystem(subsystem)) {
            throw new x.NotValid("'subsystem' should be path or instance of adone.application.Subsystem");
        }

        subsystem.app = this;

        this[SUBSYSTEMS].push(subsystem);

        if (configure) {
            await subsystem.configure();
        }

        if (initialize) {
            await subsystem.initialize();
        }

        return subsystem;
    }

    /**
     * Loads subsystems from specified path.
     *
     * @param {string} path Subsystems path.
     * @param {array|function} filter Array of subsystem names or filter [async] function '(name) => true | false'.
     * @param {boolean} [initialize = true] Whether subsystems should be initialized.
     * @returns {Promise<void>}
     */
    async loadSubsystemsFrom(path, filter, { initialize = true } = {}) {
        const names = await fs.readdir(path);

        if (is.array(filter)) {
            const targetNames = filter;
            filter = (name) => targetNames.includes(name);
        }

        for (const name of names) {
            if (await filter(name)) { // eslint-disable-line
                // eslint-disable-next-line
                await this.loadSubsystem({
                    subsystem: std.path.join(path, name),
                    initialize
                });
            }
        }
    }

    /**
     * Uninitializes all subsystems.
     *
     * @returns {Promise<void>}
     */
    async uninitializeSubsystems() {
        for (let i = 0; i < this[SUBSYSTEMS].length; i++) {
            const ss = this[SUBSYSTEMS][i];
            await ss.uninitialize(); // eslint-disable-line
        }
        this[SUBSYSTEMS].length = 0;
    }

    exitOnSignal(...names) {
        for (const sigName of names) {
            if (is.nil(this._exitSignals)) {
                this._exitSignals = [];
            }
            if (this._exitSignals.includes(sigName)) {
                continue;
            }
            this._exitSignals.push(sigName);
            process.on(sigName, () => this[HANDLERS].signalExit(sigName));
        }
        return this;
    }

    async _uninitialize() {
        await this.uninitialize();

        // Uninitialize subsystems
        await this.uninitializeSubsystems();

        this.removeProcessHandlers();
    }

    async exit(code = Application.SUCCESS) {
        if (this[EXITING]) {
            return;
        }
        this[EXITING] = true;

        await this._uninitialize();

        await this.emitParallel("exit", code);

        // Only main application instance can exit process.
        if (this !== instance) {
            return;
        }

        await new Promise((resolve) => {
            let fds = 0;

            // end the logger & waiting for completion
            adone.defaultLogger.done(() => {
                [process.stdout, process.stderr].forEach((std) => {
                    const fd = std.fd;
                    if (!std.bufferSize) {
                        // bufferSize equals 0 means current stream is drained.
                        fds = fds | fd;
                    } else {
                        // Appends nothing to the std queue, but will trigger `tryToExit` event on `drain`.
                        std.write && std.write("", () => {
                            fds = fds | fd;
                            if ((fds & 1) && (fds & 2)) {
                                resolve();
                            }
                        });
                    }
                    // Does not write anything more.
                    delete std.write;
                });
                if ((fds & 1) && (fds & 2)) {
                    resolve();
                }
            });
        });

        if (this[IS_MAIN]) {
            terminal.destroy();
        }

        process.exit(code);
    }

    removeProcessHandlers() {
        process.removeListener("uncaughtExectption", this[HANDLERS].uncaughtException);
        process.removeListener("unhandledRejection", this[HANDLERS].unhandledRejection);
        process.removeListener("rejectionHandled", this[HANDLERS].rejectionHandled);
        process.removeListener("beforeExit", this[HANDLERS].beforeExit);
        if (is.array(this._exitSignals)) {
            for (const sigName of this._exitSignals) {
                process.removeListener(sigName, this[HANDLERS].signalExit);
            }
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

    /**
     * Returns main command instance.
     * 
     * @returns {Command}
     */
    getMainCommand() {
        return this[MAIN_COMMAND];
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
        const command = new Command({
            name: schema.name,
            help: schema.help,
            description: schema.description,
            loader: schema.loader,
            handler: schema.handler,
            group: schema.group,
            match: schema.match,
            colors: schema.colors,
            blindMode: schema.blindMode
        });

        if (parent) {
            parent.addCommand(command);
        }

        this._initCommand(command, schema, true);
        return command;
    }

    _initCommand(command, schema, addHelp) {
        if (schema.handler) {
            command.handler = schema.handler;
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
                    return this.exit();
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
            if (!subcmd) {
                if (create) {
                    subcmd = this._createCommand({ name }, cmd);
                } else {
                    throw new x.NotExists(`No such command: ${chain.slice(0, i + 1).join(" ")}`);
                }
            }
            cmd = subcmd;
        }
        return cmd;
    }

    defineCommand(...args) {
        if (args.length < 1) {
            throw new x.InvalidArgument("The options are required");
        }
        const cmdParams = args.pop();
        const commandsChain = args;
        if (!is.object(cmdParams)) {
            throw new x.InvalidArgument("The options should be an object");
        }

        let subsystem;
        if (is.subsystem(commandsChain[0])) {
            subsystem = commandsChain.shift();
            const command = subsystem[COMMAND];
            if (command instanceof Command) {
                this._initCommand(command, cmdParams, false);
                command._subsystem = subsystem;
                return;
            }
        }

        const cmd = this._getCommand(commandsChain, true);
        const newCommand = this._createCommand(cmdParams, cmd);
        newCommand._subsystem = subsystem;
    }

    defineOption(...args) {
        if (args.length < 1) {
            throw new x.InvalidArgument("The options are required");
        }
        const optParams = args.pop();
        const commandsChain = args;
        if (!is.object(optParams)) {
            throw new x.InvalidArgument("The options should be an object");
        }
        const option = new OptionalArgument(optParams);

        let cmd;
        try {
            cmd = this._getCommand(commandsChain);
        } catch (err) {
            if (err instanceof x.NotExists) {
                err = new x.NotExists(`${option.names[0]}: Cannot define the option; ${err.message}`);
            }
            throw err;
        }
        cmd.addOption(option);
    }

    defineOptionsGroup(...args) {
        const groupParams = args.pop();
        const commandsChain = args;
        let cmd;
        try {
            cmd = this._getCommand(commandsChain);
        } catch (err) {
            if (err instanceof x.NotExists) {
                err = new x.NotExists(`Cannot define a new options group; ${err.message}`);
            }
            throw err;
        }
        cmd.addOptionsGroup(groupParams);
    }

    defineCommandsGroup(...args) {
        const groupParams = args.pop();
        const commandsChain = args;
        let cmd;
        try {
            cmd = this._getCommand(commandsChain);
        } catch (err) {
            if (err instanceof x.NotExists) {
                err = new x.NotExists(`Cannot define a new commands group; ${err.message}`);
            }
            throw err;
        }
        cmd.addCommandsGroup(groupParams);
    }

    /**
     * get an option of a particular command
     * path shouls be a dot splitted string
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
            throw new x.Unknown(`Unknown command ${parts.slice(0, i).join(".")}`);
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
        throw new x.NotExists(`${cmd.names[0]} doesnt have this option: ${optionName}`);
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
                throw new x.IllegalState('We do not handle "-" yet');
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

            const state = ["start command"];

            next: for (; !finished;) {
                const remaining = argv.length - 1 - partIndex;
                switch (state.shift()) {
                    case "start command": {
                        positional = command.arguments.slice();
                        optional = command.options.slice();
                        commands = command.commands.slice();
                        state.push("next argument");
                        break;
                    }
                    case "next argument": {
                        if (command.blindMode && positional.length === 0) {
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
                                    const subsystem = await command.loader(); // eslint-disable-line
                                    subsystem[COMMAND] = command;
                                    await subsystem.initialize(); // eslint-disable-line
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
                                    errors.push(new x.IllegalState(`unknown option: ${part}`));
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
                                errors.push(new x.IllegalState(`unknown option: ${part}`));
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
                            errors.push(new x.IllegalState(`${argument.names[0]}: invalid choice "${value}" (choose from ${argument.choices.map((x) => `"${x}"`).join(", ")})`));
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
                                errors.push(new x.IllegalState(`${argument.names[0]}: must have a value`));
                            }
                            if (argument.action === "store" && argument.value.length !== argument.nargs) {
                                errors.push(new x.IllegalState(`${argument.names[0]}: has not enough parameters, ${argument.value.length} of ${argument.nargs}`));
                            }
                            if (argument.nargs === 1) {
                                argument.value = argument.value[0];
                            }
                        } else if (argument.nargs === "+") {
                            if (argument.value.length === 0) {
                                errors.push(new x.IllegalState(`${argument.names[0]}: has not enough parameters, must have at least 1`));
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
                            errors.push(new x.IllegalState(`unknown parameter ${part}`));
                        }
                        finished = true;
                        // check required arguments
                        for (const arg of positional) {
                            if (!arg.present) {
                                if (arg.nargs === "*" || arg.nargs === "?") {
                                    arg.value = arg.default;
                                } else if (arg.nargs === "+") {
                                    errors.push(new x.IllegalState(`${arg.names[0]}: has not enough parameters, must have at least 1`));
                                } else if (is.integer(arg.nargs)) {
                                    errors.push(new x.IllegalState(`${arg.names[0]}: has not enough parameters, must have ${arg.nargs}`));
                                }
                            }
                        }
                        // should check if there are required optional arguments werent provided
                        for (const arg of optional) {
                            if (!arg.present) {
                                const { nargs } = arg;
                                if (arg.required) {
                                    errors.push(new x.IllegalState(`${arg.names[0]}: must be provided`));
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

    async _fireException(err) {
        let errCode;
        if (is.function(this.exception)) {
            errCode = await this.exception(err);
        } else {
            adone.error(err.stack || err.message || err);
            errCode = Application.ERROR;
        }
        if (!is.integer(errCode)) {
            errCode = Application.ERROR;
        }
        return this.exit(errCode);
    }

    _uncaughtException(...args) {
        return this._fireException(...args);
    }

    _unhandledRejection(...args) {
        return this._fireException(...args);
    }

    _rejectionHandled(...args) {
        return this._fireException(...args);
    }

    _signalExit(/*sigName*/) {
        return this.exit(Application.SUCCESS);
    }
}
tag.set(Application, tag.APPLICATION);
Application.SUCCESS = 0;
Application.ERROR = 1;
Application.Argument = Argument;
Application.PositionalArgument = PositionalArgument;
Application.OptionalArgument = OptionalArgument;
Application.Command = Command;

adone.lazify({
    Logger: "./logger"
}, exports, require);

export const run = async (App, ignoreArgs = false) => {
    if (is.null(instance) && is.class(App)) {
        const app = new App();
        if (!is.application(app)) {
            console.error(`${adone.terminal.styles.red.open}Invalid application class (should be derivative of 'adone.application.Application')${adone.terminal.styles.red.close}`);
            process.exit(1);
            return;
        }
        return app.run({ ignoreArgs });
    }

    // surrogate application
    const allProps = util.entries(is.class(App) ? App.prototype : App, { all: true });

    if (!is.null(instance)) {
        await instance._uninitialize();
        instance = null;
    }

    // redefine argv
    if (is.array(adone.__argv__)) {
        process.argv = adone.__argv__;
        delete adone.__argv__;
    }

    class XApplication extends adone.application.Application { }

    const props = new Map();

    for (const [name, value] of allProps) {
        if (is.function(value)) {
            XApplication.prototype[name] = value;
        } else {
            props.set(name, value);
        }
    }

    const app = new XApplication();
    if (props.size > 0) {
        for (const [name, value] of props.entries()) {
            app[name] = value;
        }
    }

    return app.run({ ignoreArgs });
};
