const { is, std } = adone;

delete process.env.OLDPWD; // initially, there's no previous directory

const shellMethods = Object.create(exports);

// Module globals (assume no execPath by default)
const DEFAULT_CONFIG = {
    fatal: false,
    globOptions: {},
    maxdepth: 255,
    noglob: false,
    silent: false,
    verbose: false,
    execPath: null
};

const config = {
    reset() {
        Object.assign(this, DEFAULT_CONFIG);
        this.execPath = process.execPath;
    },
    resetForTesting() {
        this.reset();
        this.silent = true;
    }
};

config.reset();

const state = {
    error: null,
    errorCode: 0,
    currentCmd: "shell.js",
    tempDir: null
};

// This is populated by calls to commonl.wrap()
const pipeMethods = [];

function log() {
    /* istanbul ignore next */
    if (!config.silent) {
        console.error.apply(console, arguments);
    }
}

//@
//@ ### ShellString(str)
//@
//@ Examples:
//@
//@ ```javascript
//@ var foo = ShellString('hello world');
//@ ```
//@
//@ Turns a regular string into a string-like object similar to what each
//@ command returns. This has special methods, like `.to()` and `.toEnd()`
function ShellString(stdout, stderr, code) {
    let that;
    if (stdout instanceof Array) {
        that = stdout;
        that.stdout = stdout.join("\n");
        if (stdout.length > 0) {
            that.stdout += "\n";
        }
    } else {
        that = new String(stdout);
        that.stdout = stdout;
    }
    that.stderr = stderr;
    that.code = code;
    // A list of all commands that can appear on the right-hand side of a pipe (populated by calls to common.wrap())
    pipeMethods.forEach((cmd) => {
        that[cmd] = shellMethods[cmd].bind(that);
    });
    return that;
}

export default class Base {
    constructor(name, options = {}) {
        this.name = name;
        this.options = Object.assign({
            allowGlobbing: true,
            canReceivePipe: false,
            cmdOptions: false,
            globStart: 1,
            pipeOnly: false,
            unix: true,
            wrapOutput: true
        }, options);

        if (this.options.canReceivePipe) {
            pipeMethods.push(name);
        }
        if (this.options.pipeOnly) {
            this.options.canReceivePipe = true;
            shellMethods[name] = this.execute.bind(this);
        }
    }

    // This returns all the input that is piped into the current command (or the empty string, if this isn't on the right-hand side of a pipe
    readFromPipe() {
        return state.pipedValue;
    }

    // Shows error message. Throws if config.fatal is true
    error(msg, _code, options) {
        // Validate input
        if (!is.string(msg)) {
            throw new Error("msg must be a string");
        }

        const DEFAULT_OPTIONS = {
            continue: false,
            code: 1,
            prefix: `${state.currentCmd}: `,
            silent: false
        };

        if (is.number(_code) && is.object(options)) {
            options.code = _code;
        } else if (is.object(_code)) { // no 'code'
            options = _code;
        } else if (is.number(_code)) { // no 'options'
            options = { code: _code };
        } else if (!is.number(_code)) { // only 'msg'
            options = {};
        }
        options = Object.assign({}, DEFAULT_OPTIONS, options);

        if (!state.errorCode) {
            state.errorCode = options.code;
        }

        let logEntry =- options.prefix + msg;
        if (!is.string(logEntry)) {
            throw new TypeError("Input must be a string");
        }
        logEntry = logEntry.replace(/\\/g, "/");
        state.error = state.error ? `${state.error}\n` : "";
        state.error += logEntry;

        // Throw an error, or log the entry
        if (config.fatal) {
            throw new Error(logEntry);
        }
        if (msg.length > 0 && !options.silent) {
            log(logEntry);
        }

        if (!options.continue) {
            throw {
                msg: "earlyExit",
                retValue: (new ShellString("", state.error, state.errorCode))
            };
        }
    }

    // Common wrapper for all Unix-like commands that performs glob expansion, command-logging, and other nice things
    async execute(...args) {
        let retValue = null;

        state.currentCmd = this.name;
        state.error = null;
        state.errorCode = 0;

        try {
            // Log the command to stderr, if appropriate
            if (config.verbose) {
                console.error.apply(console, [this.name].concat(args));
            }

            // If this is coming from a pipe, let's set the pipedValue (otherwise, set it to the empty string)
            state.pipedValue = (is.string(this.stdout)) ? this.stdout : "";

            if (this.options.unix === false) { // this branch is for exec()
                retValue = await this._execute(...args);
            } else { // and this branch is for everything else
                if (is.object(args[0]) && args[0].constructor.name === "Object") {
                    // a no-op, allowing the syntax `touch({'-r': file}, ...)`
                } else if (args.length === 0 || !is.string(args[0]) || args[0].length <= 1 || args[0][0] !== "-") {
                    args.unshift(""); // only add dummy option if '-option' not already present
                }

                // flatten out arrays that are arguments, to make the syntax:
                //    `cp([file1, file2, file3], dest);`
                // equivalent to:
                //    `cp(file1, file2, file3, dest);`
                args = args.reduce((accum, cur) => {
                    if (is.array(cur)) {
                        return accum.concat(cur);
                    }
                    accum.push(cur);
                    return accum;
                }, []);

                // Convert ShellStrings (basically just String objects) to regular strings
                args = args.map((arg) => {
                    if (is.object(arg) && arg.constructor.name === "String") {
                        return arg.toString();
                    }
                    return arg;
                });

                // Expand the '~' if appropriate
                const homeDir = std.os.homedir();
                args = args.map((arg) => {
                    if (is.string(arg) && arg.slice(0, 2) === "~/" || arg === "~") {
                        return arg.replace(/^~/, homeDir);
                    }
                    return arg;
                });

                // Perform glob-expansion on all arguments after globStart, but preserve the arguments before it (like regexes for sed and grep)
                if (!config.noglob && this.options.allowGlobbing === true) {
                    const globItems = args.slice(this.options.globStart);
                    if (!is.array(globItems)) {
                        throw new TypeError("must be an array");
                    }
                    let expanded = [];
                    for (let i = 0; i < globItems.length; i++) {
                        const listEl = globItems[i];
                        if (!is.string(listEl)) {
                            expanded.push(listEl);
                        } else {
                            const ret = await adone.fs.glob(listEl, config.globOptions);
                            expanded = expanded.concat(ret.length > 0 ? ret : [listEl]);
                        }
                    }
                    args = args.slice(0, this.options.globStart).concat(expanded);
                }

                try {
                    // parse options if options are provided
                    if (is.object(this.options.cmdOptions)) {
                        args[0] = this.parseOptions(args[0], this.options.cmdOptions);
                    }

                    retValue = await this._execute(...args);
                } catch (e) {
                    /* istanbul ignore else */
                    if (e.msg === "earlyExit") {
                        retValue = e.retValue;
                    } else {
                        throw e; // this is probably a bug that should be thrown up the call stack
                    }
                }
            }
        } catch (e) {
            /* istanbul ignore next */
            if (!state.error) {
                // If state.error hasn't been set it's an error thrown by Node, not us - probably a bug...
                console.error("ShellJS: internal error");
                console.error(e.stack || e);
                process.exit(1);
            }
            if (config.fatal) {
                throw e;
            }
        }

        if (this.options.wrapOutput && (is.string(retValue) || is.array(retValue))) {
            retValue = new ShellString(retValue, state.error, state.errorCode);
        }

        state.currentCmd = "shell.js";
        return retValue;
    }

    // Returns {'alice': true, 'bob': false} when passed a string and dictionary as follows:
    //   parseOptions('-a', {'a':'alice', 'b':'bob'});
    // Returns {'reference': 'string-value', 'bob': false} when passed two dictionaries of the form:
    //   parseOptions({'-r': 'string-value'}, {'r':'reference', 'b':'bob'});
    parseOptions(opt, map, errorOptions) {
        // Validate input
        if (!is.string(opt) && !is.object(opt)) {
            throw new Error("Options must be strings or key-value pairs");
        } else if (!is.object(map)) {
            throw new Error("parseOptions() internal error: map must be an object");
        } else if (errorOptions && !is.object(errorOptions)) {
            throw new Error("parseOptions() internal error: errorOptions must be object");
        }

        // All options are false by default
        const options = {};
        Object.keys(map).forEach((letter) => {
            const optName = map[letter];
            if (optName[0] !== "!") {
                options[optName] = false;
            }
        });

        if (opt === "") {
            return options;
        } // defaults

        if (typeof opt === "string") {
            if (opt[0] !== "-") {
                this.error("Options string must start with a '-'", errorOptions || {});
            }

            // e.g. chars = ['R', 'f']
            const chars = opt.slice(1).split("");

            chars.forEach((c) => {
                if (c in map) {
                    const optionName = map[c];
                    if (optionName[0] === "!") {
                        options[optionName.slice(1)] = false;
                    } else {
                        options[optionName] = true;
                    }
                } else {
                    this.error(`option not recognized: ${c}`, errorOptions || {});
                }
            });
        } else { // opt is an Object
            Object.keys(opt).forEach((key) => {
                // key is a string of the form '-r', '-d', etc.
                const c = key[1];
                if (c in map) {
                    const optionName = map[c];
                    options[optionName] = opt[key]; // assign the given value
                } else {
                    this.error(`option not recognized: ${c}`, errorOptions || {});
                }
            });
        }
        return options;
    }
}
