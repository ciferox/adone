const { is, x, text } = adone;

const INTERNAL = Symbol.for("adone:application:internal");
const UNNAMED = Symbol.for("adone:application:unnamed");
const EMPTY_VALUE = Symbol.for("adone:application:emptyValue");

const escape = (x) => x.replace(/%/g, "%%");

class Argument {
    constructor(options = {}) {
        options = Argument.normalize(options);

        this.names = options.name;
        this.action = options.action;
        this.nargs = options.nargs;
        this.default = options.default;
        this.type = options.type;
        this.help = options.help;
        this.required = options.required;
        this.holder = options.holder;
        this.choices = options.choices && options.choices.slice();
        this._value = EMPTY_VALUE;
        this.present = false;
        this.internal = options[INTERNAL] === true;
        this.const = options.const;
        this.appendDefaultHelpMessage = options.appendDefaultMessage;
        this.appendChoicesHelpMessage = options.appendChoicesHelpMessage;
    }

    get value() {
        if (!this.hasValue()) {
            if (this.action === "store_true") {
                return false;
            }
            if (this.action === "store_false") {
                return true;
            }
            if (this.nargs === "*") {
                return [];
            }
            return this.default;
        }
        return this._value;
    }

    set value(value) {
        this._value = value;
    }

    coerce(value) {
        if (is.array(this.type)) {
            if (is.class(this.type[this.value.length])) {
                return new this.type[this.value.length](value);
            }
            return this.type[this.value.length](value);
        }
        if (is.array(this.value)) {
            if (is.class(this.type)) {
                return new this.type(value, this.value.length);
            }
            return this.type(value, this.value.length);
        }
        if (is.class(this.type)) {
            return new this.type(value);
        }
        return this.type(value);
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
        if (!options.name || !options.name.length) {
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
        if (!options.help) {
            options.help = "";
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

        return options;
    }

    _formatValue(x) {
        return JSON.stringify(x);
    }

    getShortHelpMessage() {
        let msg = this.help;

        if (this.appendChoicesHelpMessage && this.choices) {
            const formatted = this.choices.map((x) => this._formatValue(x)).join(", ");
            if (msg) {
                msg = `${msg} `;
            }
            msg = `${msg}(${formatted})`;
        }

        if (this.appendDefaultHelpMessage && this.action === "store" && this.hasDefaultValue()) {
            const value = this.default === "" ? "empty string" : this._formatValue(this.default);
            if (msg) {
                msg = `${msg}\n`;
            }
            msg = `${msg}default: ${value}`;
        }
        return msg;
    }
}

class PositionalArgument extends Argument {
    constructor(options = {}) {
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
        super(options);
        if ("action" in options && options.action !== "store") {
            throw new x.IllegalState(`${this.names[0]}: A positional agrument must have action = store`);
        }
        if (this.names.length > 1) {
            throw new x.IllegalState(`${this.names[0]}: A positional argument cannot have multiple names`);
        }
        if (this.names[0][0] === "-") {
            throw new x.IllegalState(`${this.names[0]}: The name of a positional argument cannot start with \"-\"`);
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
        const arg = `<${this.usageVariable}>`;
        let msg = null;
        if (this.nargs === "+") {
            msg = `${arg} [${arg} ...]`;
        } else if (this.nargs === "*") {
            msg = `[${arg} ...]`;
        } else if (this.nargs === "?") {
            msg = `[${arg}]`;
        } else if (is.integer(this.nargs)) {
            msg = `${arg} `.repeat(this.nargs - 1);
            msg = `${msg}${arg}`;
        }
        return msg;
    }

    getNamesMessage() {
        if (this.holder) {
            return this.holder;
        }
        return this.names.join(", ");
    }
}

class OptionalArgument extends Argument {
    constructor(options = {}) {
        if (is.string(options)) {
            options = { name: options };
        }
        super(adone.o({
            action: (options.choices || options.nargs || (options.type && options.type !== Boolean)) ? "store" : "store_true"
        }, options));
        for (const name of this.names) {
            if (name[0] !== "-") {
                throw new x.IllegalState(`${this.names[0]}: The name of an optional argument must start with \"-\": ${name}`);
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
        if (this.mappedNames === null) {
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
        let msg = `${allNames ? this.names.join(", ") : this.names[0]}`;
        const usageVariable = this.usageVariable;
        if (this.nargs === "+") {
            msg = `${msg} ${usageVariable} [${usageVariable} ...]`;
        } else if (this.nargs === "*") {
            msg = `${msg} [${usageVariable} ...]`;
        } else if (this.nargs === "?") {
            msg = `${msg} [${usageVariable}]`;
        } else if (is.integer(this.nargs) && this.nargs) {
            const t = `${usageVariable} `.repeat(this.nargs - 1);
            msg = `${msg} ${t}${usageVariable}`;
        }
        if (required && !this.required) {
            msg = `[${msg}]`;
        }
        return msg;
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
        if (length + args[i].length + 1 >= maxLength && line.length !== 0) {
            lines.push(line.join(" "));
            line = [];
            length = 0;
        }
        length += args[i].length + 1;
        line.push(args[i]);
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

const commandsWrap = (cmds, maxLength) => {
    const lines = [];
    let length = 0;
    let line = [];
    for (let i = 0; i < cmds.length; ++i) {
        if (line.length !== 0 && length + 3 + cmds[i].length + 2 > maxLength) {
            lines.push(line.join(" | "));
            line = [];
            length = 0;
        }
        if (line.length === 0) {
            if (lines.length === 0) {
                line.push(`{ ${cmds[i]}`);
            } else {
                line.push(`  ${cmds[i]}`);
            }
            length += 2 + cmds[i].length;
        } else {
            line.push(cmds[i]);
            length += 3 + cmds[i].length;
        }
    }
    if (line.length) {
        lines.push(line.join(" | "));
    }
    lines[lines.length - 1] = `${lines[lines.length - 1]} }`;
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
        for (const arg of args) {
            for (let name of arg.names) {
                let i = 0;
                while (name[i] === "-") {
                    ++i;
                }
                name = name.slice(i);
                this.args.set(name, arg);
                this.args.set(text.toCamelCase(name), arg);
            }
        }
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
        this.help = options.help;
        this.description = options.description || options.help;
        this.handler = options.handler;
        this.parent = null;
        this._subsystem = null;
        this.arguments = [];
        this.group = options.group;
        this._match = options.match;

        this.optionsGroups = [new Group({ name: UNNAMED })];
        this.commandsGroups = [new Group({ name: UNNAMED })];
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
        for (const group of this.optionsGroups) {
            if (group.name === newOption.group) {
                group.add(newOption);
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
            newCommand = new Command(newCommand);
        }
        if (this.hasCommand(newCommand)) {
            throw new x.IllegalState(`${this.names[0]}: Cannot add the command ${newCommand.names[0]} due to name collision`);
        }
        for (const group of this.commandsGroups) {
            if (group.name === newCommand.group) {
                group.add(newCommand);
                newCommand.parent = this;
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
        if (!options.name) {
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

        if (!options.help) {
            options.help = "";
        }
        if (!options.description) {
            options.description = "";
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
        const argumentsLength = adone.terminal.cols - chain.length - 1 - 4;
        const table = new text.table.BorderlessTable({
            colWidths: [4, chain.length + 1, argumentsLength]
        });
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
                const names = [...group].map((x) => x.names[0]);
                table.push([null, chain, `${commandsWrap(names, argumentsLength)} ...`]);
            }
        }
        return `${table.length === 1 ? "Usage:" : "Usages:"}\n${table.toString()}`;
    }

    getNamesMessage() {
        return this.names.join(", ");
    }

    getShortHelpMessage() {
        return this.help;
    }

    getHelpMessage() {
        const helpMessage = [this.getUsageMessage()];

        const totalWidth = adone.terminal.cols;

        if (this.description) {
            helpMessage.push("", text.wordwrap(this.description, totalWidth));
        }

        const options = this.options;
        const commands = this.commands;
        if (this.arguments.length || options.length || commands.length) {
            helpMessage.push("");
            if (this.arguments.length) {
                helpMessage.push("Arguments:");
                const table = new text.table.BorderlessTable({
                    colWidths: [4, null, 2, null]
                });
                const namesMessages = this.arguments.map((arg) => {
                    return text.wordwrap(arg.getNamesMessage(), 40);
                });
                const maxNamesLength = namesMessages.reduce((x, y) => Math.max(x, y.length), 0);
                for (const arg of this.arguments) {
                    table.push([
                        null,
                        namesMessages.shift(),
                        null,
                        text.wordwrap(
                            arg.getShortHelpMessage(),
                            totalWidth - 4 - maxNamesLength - 2
                        )
                    ]);
                }
                helpMessage.push(table.toString());
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
                            helpMessage.push("Other options:");
                        } else {
                            // we have only unnamed options
                            helpMessage.push("Options:");
                        }
                    } else {
                        helpMessage.push(`${group.description}:`);
                    }
                    const table = new text.table.BorderlessTable({
                        colWidths: [4, null, 2, null]
                    });
                    const namesMessages = [...group].map((opt) => {
                        return text.wordwrap(
                            opt.getUsageMessage({ required: false, allNames: true }),
                            40
                        );
                    });
                    const maxNamesLength = namesMessages.reduce((x, y) => Math.max(x, y.length), 0);
                    for (const opt of group) {
                        table.push([
                            null,
                            namesMessages.shift(),
                            null,
                            text.wordwrap(
                                opt.getShortHelpMessage(),
                                totalWidth - 4 - maxNamesLength - 2
                            )
                        ]);
                    }
                    helpMessage.push(table.toString());
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
                            helpMessage.push("Other commands:");
                        } else {
                            // we have only unnamed options
                            helpMessage.push("Commands:");
                        }
                    } else {
                        helpMessage.push(`${group.description}:`);
                    }
                    const table = new text.table.BorderlessTable({
                        colWidths: [4, null, 2, null]
                    });
                    const namesMessages = [...group].map((cmd) => {
                        return text.wordwrap(cmd.getNamesMessage(), 40);
                    });
                    const maxNamesLength = namesMessages.reduce((x, y) => Math.max(x, y.length), 0);
                    for (const cmd of group) {
                        table.push([
                            null,
                            namesMessages.shift(),
                            null,
                            text.wordwrap(
                                cmd.getShortHelpMessage(),
                                totalWidth - 4 - maxNamesLength - 2
                            )
                        ]);
                    }
                    helpMessage.push(table.toString());

                }
            }
        }
        return helpMessage.join("\n");
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

export default class Application extends adone.application.Subsystem {
    constructor({
        name = adone.std.path.basename(process.argv[1], adone.std.path.extname(process.argv[1])),
        main,
        argv = process.argv.slice(2),
        commandRequired = false } = {}) {

        super();

        this.argv = argv;
        this.env = process.env;
        this._commands = [];
        this._options = [];
        this._name = name;
        this._commandRequired = commandRequired;

        this._awaiters = {};
        this._exiting = false;
        this._main = main;
        this._mainCommand = null;
        this._errorScope = false;
        this._version = null;

        this._subsystems = [];
        this.adoneRootPath = adone.std.path.resolve(__dirname, "../../..");
        this.adoneDefaultsPath = adone.std.path.resolve(this.adoneRootPath, "defaults");
        this.defaultConfigsPath = adone.std.path.resolve(this.adoneDefaultsPath, "configs");

        if (main) {
            this._setupMain();
        }

        this.setMaxListeners(Infinity);
        this.defineMainCommand();
    }

    _setupMain() {
        // setup the main application
        // Prevent double initialization of global application instance
        // (for cases where two or more Applications run in-process, the first app will be common).
        if (!is.nil(adone.appinstance)) {
            throw new x.IllegalState("It is impossible to have several main applications");
        }
        adone.appinstance = this;

        const uncaughtException = (...args) => this._uncaughtException(...args);
        const unhandledRejection = (...args) => this._unhandledRejection(...args);
        const rejectionHandled = (...args) => this._rejectionHandled(...args);
        const beforeExit = () => this.exit();
        const signalExit = (sigName) => this._signalExit(sigName);
        this._handlers = {
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
        this._main = true;
    }

    main() {

    }

    async run({ ignoreArgs = false } = {}) {
        try {
            if (is.nil(adone.appinstance) && this._main !== false) {
                this._setupMain();
            }
            // Load adone configuration.
            this.config = new adone.configuration.FileConfiguration({ base: this.adoneRootPath });
            await this.loadAdoneConfig("adone", this.defaultConfigsPath);

            this._errorScope = true;
            await this.initialize();

            // Initialize subsystems
            for (let i = 0; i < this._subsystems.length; i++) {
                const ss = this._subsystems[i];
                await ss.initialize();  // eslint-disable-line no-await-in-loop
            }
            this._errorScope = false;
            let command = this._mainCommand;
            let errors = [];
            let rest = [];
            let match = null;
            if (!ignoreArgs) {
                ({ command, errors, rest, match } = await this._parseArgs(this.argv));
            }

            if (errors.length) {
                adone.log(escape(command.getUsageMessage()));
                adone.log();
                for (const error of errors) {
                    adone.log(escape(error.message));
                }
                return this.exit(Application.ERROR_EXIT);
            }
            this._errorScope = true;
            const code = await command.execute(rest, match);
            this._errorScope = false;
            if (is.integer(code)) {
                return this.exit(code);
            }
        } catch (err) {
            if (this._errorScope) {
                return this._fireException(err);
            } else {
                adone.error(err.stack || err.message || err);
                return this.exit(Application.ERROR);
            }
        }
    }

    async loadAdoneConfig(name) {
        const basename = `${name}.js`;
        const defaultConfigPath = adone.std.path.join(this.defaultConfigsPath, basename);
        await this.config.load(defaultConfigPath, name);
        await adone.fs.copy(defaultConfigPath, this.config.adone.configsPath, {
            ignoreExisting: true
        });
        const userConfigPath = adone.std.path.join(this.config.adone.configsPath, basename);
        await this.config.load(userConfigPath, name);
    }

    addSubsystem(subsystem) {
        if (is.string(subsystem)) {
            if (!adone.std.path.isAbsolute(subsystem)) {
                subsystem = adone.std.path.resolve(process.cwd(), subsystem);
            }
            let Subsystem = require(subsystem);
            if (Subsystem.__esModule === true) {
                Subsystem = Subsystem.default;
            }
            subsystem = new Subsystem();
        }
        subsystem.app = this;

        this._subsystems.push(subsystem);
    }

    exitOnSignal(sigName) {
        if (is.nil(this._exitSignals)) {
            this._exitSignals = [];
        }
        if (this._exitSignals.includes(sigName)) {
            return;
        }
        this._exitSignals.push(sigName);
        process.on(sigName, () => this._handlers.signalExit(sigName));
    }

    async exit(code = Application.SUCCESS) {
        if (this._exiting) {
            return;
        }
        this._exiting = true;

        // Uninitialize subsystems
        for (let i = 0; i < this._subsystems.length; i++) {
            const ss = this._subsystems[i];
            // eslint-disable-next-line no-await-in-loop
            await ss.uninitialize();
        }

        await Promise.resolve(this.uninitialize());

        // Only main application instance can exit process.
        if (this !== adone.appinstance) {
            return;
        }
        process.removeListener("uncaughtExectption", this._handlers.uncaughtException);
        process.removeListener("unhandledRejection", this._handlers.unhandledRejection);
        process.removeListener("rejectionHandled", this._handlers.rejectionHandled);
        process.removeListener("beforeExit", this._handlers.beforeExit);
        if (is.array(this._exitSignals)) {
            for (const sigName of this._exitSignals) {
                process.removeListener(sigName, this._handlers.signalExit);
            }
        }
        await new Promise((resolve) => {
            let fds = 0;
            code = code || Application.SUCCESS;

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
        process.exit(code);
    }

    customizeLogger() {

    }

    async getVersion() {
        if (this._version !== null) {
            return this._version;
        }
        let currentPath = __dirname;
        for (; ;) {
            const packagePath = adone.std.path.join(currentPath, "package.json");
            try {
                // eslint-disable-next-line
                const data = JSON.parse(await adone.fs.readFile(packagePath));
                return this._version = data.version;
            } catch (err) {
                //
            }
            const nextPath = adone.std.path.dirname(currentPath);
            if (currentPath === nextPath) {  // that was the root
                break;
            }
            currentPath = nextPath;
        }
        return this._version = undefined;
    }

    defineArguments(options = {}) {
        const mainOptionsGroups = this._mainCommand.optionsGroups
            .filter((x) => x.name !== UNNAMED)
            .map((x) => ({ name: x.name, description: x.description }));
        const mainCommandsGroups = this._mainCommand.commandsGroups
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

    defineMainCommand(options) {
        options = adone.o({
            name: this._name,
            handler: (args, opts, meta) => this.main(args, opts, meta),
            options: [],
            arguments: [],
            commands: [],
            commandsGroups: [],
            optionsGroups: []
        }, options);
        if (options.addVersion !== false) {
            options.options.unshift({
                name: "--version",
                help: "show the version",
                handler: async () => {
                    adone.log(escape(await this.getVersion()));
                    return 0;
                },
                [INTERNAL]: true
            });
        }
        this._mainCommand = this._parseCommand(options);
        this._mainCommand._subsystem = this;
        return this;
    }

    _parseCommand(schema) {
        const commandParams = adone.o({
            addHelp: true
        }, schema);
        if (schema.handler) {
            commandParams.handler = schema.handler;
        }

        const cmd = new Command({
            name: schema.name,
            help: schema.help,
            description: schema.description,
            handler: schema.handler,
            group: schema.group,
            match: schema.match
        });

        if (schema.arguments) {
            for (const arg of schema.arguments) {
                cmd.addArgument(arg);
            }
        }

        if (schema.optionsGroups) {
            for (const group of schema.optionsGroups) {
                cmd.addOptionsGroup(group);
            }
        }

        const options = schema.options ? schema.options.slice() : [];
        if (commandParams.addHelp) {
            options.unshift({
                name: ["--help", "-h"],
                help: "show this message",
                handler: (_, cmd) => {
                    adone.log(escape(cmd.getHelpMessage()));
                    return this.exit();
                },
                [INTERNAL]: true
            });
        }
        for (const opts of options) {
            cmd.addOption(opts);
        }

        if (schema.commandsGroups) {
            for (const group of schema.commandsGroups) {
                cmd.addCommandsGroup(group);
            }
        }

        if (schema.commands) {
            for (const cmdParams of schema.commands) {
                const command = this._parseCommand(cmdParams);
                cmd.addCommand(command);
            }
        }
        return cmd;
    }

    _getCommand(chain, create = false) {
        let cmd = this._mainCommand;
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
                    subcmd = this._parseCommand({ name });
                    cmd.addCommand(subcmd);
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
        }

        const cmd = this._getCommand(commandsChain, true);
        const newCommand = this._parseCommand(cmdParams);
        newCommand._subsystem = subsystem;
        cmd.addCommand(newCommand);
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
        let cmd = this._mainCommand;
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

        let command = this._mainCommand;
        let match = this._mainCommand.names[0];
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
                argv.push(part.slice(0, index));  // --smth
                argv.push(part.slice(index + 1));  // VALUE, can be empty, ok? --opt="" or --opt=
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
                            }  // current part is a parameter if the argument is positional
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
                                    continue possible;   // calc n of required args
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
                        if (argument.required || argument.optional) {  // optional was passed, have to calculate
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
                        finished = true;
                        if (remaining >= 0) {  // it should be -1 if there are no elements, so we have extra args, weird
                            errors.push(new x.IllegalState(`unknown parameter ${part}`));
                        }
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
                            if (part === undefined) {
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
            errCode = this.ERROR_EXIT;
        }
        if (!Number.isInteger(errCode)) {
            errCode = this.ERROR_EXIT;
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
adone.tag.set(Application, adone.tag.APPLICATION);
Application.prototype[adone.tag.APPLICATION] = true;
Application.SUCCESS = 0;
Application.ERROR = 1;
Application.Argument = Argument;
Application.PositionalArgument = PositionalArgument;
Application.OptionalArgument = OptionalArgument;
Application.Command = Command;
