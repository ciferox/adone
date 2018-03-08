const glob = require("glob");
const shell = require(".");

const {
    is,
    std: { os, fs }
} = adone;

const shellMethods = Object.create(shell);

exports.extend = Object.assign;

// Module globals (assume no execPath by default)
const DEFAULT_CONFIG = {
    fatal: false,
    globOptions: {},
    maxdepth: 255,
    noglob: false,
    silent: false,
    verbose: false,
    execPath: null,
    bufLength: 64 * 1024 // 64KB
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
exports.config = config;

const state = {
    error: null,
    errorCode: 0,
    currentCmd: "shell.js",
    tempDir: null
};
exports.state = state;

delete process.env.OLDPWD; // initially, there's no previous directory

// Reliably test if something is any sort of javascript object
function isObject(a) {
    return typeof a === "object" && !is.null(a);
}
exports.isObject = isObject;

function log() {
    /* istanbul ignore next */
    if (!config.silent) {
        console.error.apply(console, arguments);
    }
}
exports.log = log;

// Converts strings to be equivalent across all platforms. Primarily responsible
// for making sure we use '/' instead of '\' as path separators, but this may be
// expanded in the future if necessary
function convertErrorOutput(msg) {
    if (!is.string(msg)) {
        throw new TypeError("input must be a string");
    }
    return msg.replace(/\\/g, "/");
}
exports.convertErrorOutput = convertErrorOutput;

// Shows error message. Throws if config.fatal is true
function error(msg, _code, options) {
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

    if (is.number(_code) && isObject(options)) {
        options.code = _code;
    } else if (isObject(_code)) { // no 'code'
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

    const logEntry = convertErrorOutput(options.prefix + msg);
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
exports.error = error;

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
//@ command returns. This has special methods, like `.to()` and `.toEnd()`.
const ShellString = function (stdout, stderr, code) {
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
    // A list of all commands that can appear on the right-hand side of a pipe
    // (populated by calls to common.wrap())
    pipeMethods.forEach((cmd) => {
        that[cmd] = shellMethods[cmd].bind(that);
    });
    return that;
};

exports.ShellString = ShellString;

// Returns {'alice': true, 'bob': false} when passed a string and dictionary as follows:
//   parseOptions('-a', {'a':'alice', 'b':'bob'});
// Returns {'reference': 'string-value', 'bob': false} when passed two dictionaries of the form:
//   parseOptions({'-r': 'string-value'}, {'r':'reference', 'b':'bob'});
// Throws an error when passed a string that does not start with '-':
//   parseOptions('a', {'a':'alice'}); // throws
function parseOptions(opt, map, errorOptions) {
    // Validate input
    if (!is.string(opt) && !isObject(opt)) {
        throw new Error("options must be strings or key-value pairs");
    } else if (!isObject(map)) {
        throw new Error("parseOptions() internal error: map must be an object");
    } else if (errorOptions && !isObject(errorOptions)) {
        throw new Error("parseOptions() internal error: errorOptions must be object");
    }

    if (opt === "--") {
        // This means there are no options.
        return {};
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

    if (is.string(opt)) {
        if (opt[0] !== "-") {
            throw new Error("Options string must start with a '-'");
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
                error(`option not recognized: ${c}`, errorOptions || {});
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
                error(`option not recognized: ${c}`, errorOptions || {});
            }
        });
    }
    return options;
}
exports.parseOptions = parseOptions;

// Expands wildcards with matching (ie. existing) file names.
// For example:
//   expand(['file*.js']) = ['file1.js', 'file2.js', ...]
//   (if the files 'file1.js', 'file2.js', etc, exist in the current dir)
function expand(list) {
    if (!is.array(list)) {
        throw new TypeError("must be an array");
    }
    let expanded = [];
    list.forEach((listEl) => {
        // Don't expand non-strings
        if (!is.string(listEl)) {
            expanded.push(listEl);
        } else {
            let ret;
            try {
                ret = glob.sync(listEl, config.globOptions);
                // if nothing matched, interpret the string literally
                ret = ret.length > 0 ? ret : [listEl];
            } catch (e) {
                // if glob fails, interpret the string literally
                ret = [listEl];
            }
            expanded = expanded.concat(ret);
        }
    });
    return expanded;
}
exports.expand = expand;

// Normalizes Buffer creation, using Buffer.alloc if possible.
// Also provides a good default buffer length for most use cases.
const buffer = is.function(Buffer.alloc) ?
    function (len) {
        return Buffer.alloc(len || config.bufLength);
    } :
    function (len) {
        return new Buffer(len || config.bufLength);
    };
exports.buffer = buffer;

// Normalizes _unlinkSync() across platforms to match Unix behavior, i.e.
// file can be unlinked even if it's read-only, see https://github.com/joyent/node/issues/3006
function unlinkSync(file) {
    try {
        fs.unlinkSync(file);
    } catch (e) {
        // Try to override file permission
        /* istanbul ignore next */
        if (e.code === "EPERM") {
            fs.chmodSync(file, "0666");
            fs.unlinkSync(file);
        } else {
            throw e;
        }
    }
}
exports.unlinkSync = unlinkSync;

// wrappers around common.statFollowLinks and common.statNoFollowLinks that clarify intent
// and improve readability
function statFollowLinks() {
    return fs.statSync.apply(fs, arguments);
}
exports.statFollowLinks = statFollowLinks;

function statNoFollowLinks() {
    return fs.lstatSync.apply(fs, arguments);
}
exports.statNoFollowLinks = statNoFollowLinks;

// e.g. 'shelljs_a5f185d0443ca...'
function randomFileName() {
    function randomHash(count) {
        if (count === 1) {
            return parseInt(16 * Math.random(), 10).toString(16);
        }
        let hash = "";
        for (let i = 0; i < count; i++) {
            hash += randomHash(1);
        }
        return hash;
    }

    return `shelljs_${randomHash(20)}`;
}
exports.randomFileName = randomFileName;

// Common wrapper for all Unix-like commands that performs glob expansion,
// command-logging, and other nice things
const wrap = function (cmd, fn, options = {}) {
    return function () {
        let retValue = null;

        state.currentCmd = cmd;
        state.error = null;
        state.errorCode = 0;

        try {
            let args = [].slice.call(arguments, 0);

            // Log the command to stderr, if appropriate
            if (config.verbose) {
                console.error(...[cmd].concat(args));
            }

            // If this is coming from a pipe, let's set the pipedValue (otherwise, set
            // it to the empty string)
            state.pipedValue = (this && is.string(this.stdout)) ? this.stdout : "";

            if (options.unix === false) { // this branch is for exec()
                retValue = fn.apply(this, args);
            } else { // and this branch is for everything else
                if (isObject(args[0]) && args[0].constructor.name === "Object") {
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
                    if (isObject(arg) && arg.constructor.name === "String") {
                        return arg.toString();
                    }
                    return arg;
                });

                // Expand the '~' if appropriate
                const homeDir = os.homedir();
                args = args.map((arg) => {
                    if (is.string(arg) && arg.slice(0, 2) === "~/" || arg === "~") {
                        return arg.replace(/^~/, homeDir);
                    }
                    return arg;
                });

                // Perform glob-expansion on all arguments after globStart, but preserve
                // the arguments before it (like regexes for sed and grep)
                if (!config.noglob && options.allowGlobbing === true) {
                    args = args.slice(0, options.globStart).concat(expand(args.slice(options.globStart)));
                }

                try {
                    // parse options if options are provided
                    if (isObject(options.cmdOptions)) {
                        args[0] = parseOptions(args[0], options.cmdOptions);
                    }

                    retValue = fn.apply(this, args);
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
                e.name = "ShellJSInternalError";
                throw e;
            }
            if (config.fatal) {
                throw e;
            }
        }

        if (options.wrapOutput &&
            (is.string(retValue) || is.array(retValue))) {
            retValue = new ShellString(retValue, state.error, state.errorCode);
        }

        state.currentCmd = "shell.js";
        return retValue;
    };
};
exports.wrap = wrap;

// This returns all the input that is piped into the current command (or the
// empty string, if this isn't on the right-hand side of a pipe
const _readFromPipe = () => state.pipedValue;
exports.readFromPipe = _readFromPipe;

const DEFAULT_WRAP_OPTIONS = {
    allowGlobbing: true,
    canReceivePipe: false,
    cmdOptions: null,
    globStart: 1,
    pipeOnly: false,
    wrapOutput: true,
    unix: true
};

// This is populated during plugin registration
const pipeMethods = [];

// Register a new ShellJS command
const _register = function (name, implementation, wrapOptions = {}) {
    // Validate options
    Object.keys(wrapOptions).forEach((option) => {
        if (!DEFAULT_WRAP_OPTIONS.hasOwnProperty(option)) {
            throw new Error(`Unknown option '${option}'`);
        }
        if (typeof wrapOptions[option] !== typeof DEFAULT_WRAP_OPTIONS[option]) {
            throw new TypeError(`Unsupported type '${typeof wrapOptions[option]}' for option '${option}'`);
        }
    });

    // If an option isn't specified, use the default
    const options = {
        ...DEFAULT_WRAP_OPTIONS,
        ...wrapOptions
    };

    if (options.pipeOnly) {
        options.canReceivePipe = true;
        shellMethods[name] = wrap(name, implementation, options);
    } else {
        shell[name] = wrap(name, implementation, options);
    }

    if (options.canReceivePipe) {
        pipeMethods.push(name);
    }
};

exports.register = _register;
