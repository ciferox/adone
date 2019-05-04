/**
 * Cross-browser support for logging in a web application.
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 *
 * Copyright (c) 2008-2013 Digital Bazaar, Inc.
 */

const {
    is,
    crypto
} = adone;

/**
 * Application logging system.
 *
 * Each logger level available as it's own function of the form:
 *   crypto.log.level(category, args...)
 * The category is an arbitrary string, and the args are the same as
 * Firebug's console.log API. By default the call will be output as:
 *   'LEVEL [category] <args[0]>, args[1], ...'
 * This enables proper % formatting via the first argument.
 * Each category is enabled by default but can be enabled or disabled with
 * the setCategoryEnabled() function.
 */
// list of known levels
export const levels = [
    "none", "error", "warning", "info", "debug", "verbose", "max"];
// info on the levels indexed by name:
//   index: level index
//   name: uppercased display name
const sLevelInfo = {};
// list of loggers
const sLoggers = [];
/**
 * Standard console logger. If no console support is enabled this will
 * remain null. Check before using.
 */
let sConsoleLogger = null;

// logger flags
/**
 * Lock the level at the current value. Used in cases where user config may
 * set the level such that only critical messages are seen but more verbose
 * messages are needed for debugging or other purposes.
 */
export const LEVEL_LOCKED = (1 << 1);
/**
 * Always call log function. By default, the logging system will check the
 * message level against logger.level before calling the log function. This
 * flag allows the function to do its own check.
 */
export const NO_LEVEL_CHECK = (1 << 2);
/**
 * Perform message interpolation with the passed arguments. "%" style
 * fields in log messages will be replaced by arguments as needed. Some
 * loggers, such as Firebug, may do this automatically. The original log
 * message will be available as 'message' and the interpolated version will
 * be available as 'fullMessage'.
 */
export const INTERPOLATE = (1 << 3);

// setup each log level
for (let i = 0; i < levels.length; ++i) {
    const level = levels[i];
    sLevelInfo[level] = {
        index: i,
        name: level.toUpperCase()
    };
}

/**
 * Message logger. Will dispatch a message to registered loggers as needed.
 *
 * @param message message object
 */
export const logMessage = function (message) {
    const messageLevelIndex = sLevelInfo[message.level].index;
    for (let i = 0; i < sLoggers.length; ++i) {
        const logger = sLoggers[i];
        if (logger.flags & NO_LEVEL_CHECK) {
            logger.f(message);
        } else {
            // get logger level
            const loggerLevelIndex = sLevelInfo[logger.level].index;
            // check level
            if (messageLevelIndex <= loggerLevelIndex) {
                // message critical enough, call logger
                logger.f(logger, message);
            }
        }
    }
};

/**
 * Sets the 'standard' key on a message object to:
 * "LEVEL [category] " + message
 *
 * @param message a message log object
 */
export const prepareStandard = function (message) {
    if (!("standard" in message)) {
        message.standard =
      `${sLevelInfo[message.level].name 
      //' ' + +message.timestamp +
      } [${message.category}] ${ 
          message.message}`;
    }
};

/**
 * Sets the 'full' key on a message object to the original message
 * interpolated via % formatting with the message arguments.
 *
 * @param message a message log object.
 */
export const prepareFull = function (message) {
    if (!("full" in message)) {
    // copy args and insert message at the front
        let args = [message.message];
        args = args.concat([] || message.arguments);
        // format the message
        message.full = crypto.util.format.apply(this, args);
    }
};

/**
 * Applies both preparseStandard() and prepareFull() to a message object and
 * store result in 'standardFull'.
 *
 * @param message a message log object.
 */
export const prepareStandardFull = function (message) {
    if (!("standardFull" in message)) {
    // FIXME implement 'standardFull' logging
        prepareStandard(message);
        message.standardFull = message.standard;
    }
};

// create log level functions
if (true) {
    // levels for which we want functions
    const levels = ["error", "warning", "info", "debug", "verbose"];
    for (let i = 0; i < levels.length; ++i) {
    // wrap in a function to ensure proper level var is passed
        (function (level) {
            // create function for this level
            crypto.log[level] = function (category, message/*, args...*/) {
                // convert arguments to real array, remove category and message
                const args = Array.prototype.slice.call(arguments).slice(2);
                // create message object
                // Note: interpolation and standard formatting is done lazily
                const msg = {
                    timestamp: new Date(),
                    level,
                    category,
                    message,
                    arguments: args
                    /*standard*/
                    /*full*/
                    /*fullMessage*/
                };
                // process this message
                logMessage(msg);
            };
        })(levels[i]);
    }
}

/**
 * Creates a new logger with specified custom logging function.
 *
 * The logging function has a signature of:
 *   function(logger, message)
 * logger: current logger
 * message: object:
 *   level: level id
 *   category: category
 *   message: string message
 *   arguments: Array of extra arguments
 *   fullMessage: interpolated message and arguments if INTERPOLATE flag set
 *
 * @param logFunction a logging function which takes a log message object
 *          as a parameter.
 *
 * @return a logger object.
 */
export const makeLogger = function (logFunction) {
    const logger = {
        flags: 0,
        f: logFunction
    };
    setLevel(logger, "none");
    return logger;
};

/**
 * Sets the current log level on a logger.
 *
 * @param logger the target logger.
 * @param level the new maximum log level as a string.
 *
 * @return true if set, false if not.
 */
export const setLevel = function (logger, level) {
    let rval = false;
    if (logger && !(logger.flags & LEVEL_LOCKED)) {
        for (let i = 0; i < levels.length; ++i) {
            const aValidLevel = levels[i];
            if (level === aValidLevel) {
                // set level
                logger.level = level;
                rval = true;
                break;
            }
        }
    }

    return rval;
};

/**
 * Locks the log level at its current value.
 *
 * @param logger the target logger.
 * @param lock boolean lock value, default to true.
 */
export const lock = function (logger, lock) {
    if (is.undefined(lock) || lock) {
        logger.flags |= LEVEL_LOCKED;
    } else {
        logger.flags &= ~LEVEL_LOCKED;
    }
};

/**
 * Adds a logger.
 *
 * @param logger the logger object.
 */
export const addLogger = function (logger) {
    sLoggers.push(logger);
};

// setup the console logger if possible, else create fake console.log
if (!is.undefined(console) && "log" in console) {
    let logger;
    if (console.error && console.warn && console.info && console.debug) {
    // looks like Firebug-style logging is available
    // level handlers map
        const levelHandlers = {
            error: console.error,
            warning: console.warn,
            info: console.info,
            debug: console.debug,
            verbose: console.debug
        };
        var f = function (logger, message) {
            prepareStandard(message);
            const handler = levelHandlers[message.level];
            // prepend standard message and concat args
            let args = [message.standard];
            args = args.concat(message.arguments.slice());
            // apply to low-level console function
            handler.apply(console, args);
        };
        logger = makeLogger(f);
    } else {
    // only appear to have basic console.log
        var f = function (logger, message) {
            prepareStandardFull(message);
            console.log(message.standardFull);
        };
        logger = makeLogger(f);
    }
    setLevel(logger, "debug");
    addLogger(logger);
    sConsoleLogger = logger;
} else {
    // define fake console.log to avoid potential script errors on
    // browsers that do not have console logging
    console = {
        log() {}
    };
}

/*
 * Check for logging control query vars.
 *
 * console.level=<level-name>
 * Set's the console log level by name.  Useful to override defaults and
 * allow more verbose logging before a user config is loaded.
 *
 * console.lock=<true|false>
 * Lock the console log level at whatever level it is set at.  This is run
 * after console.level is processed.  Useful to force a level of verbosity
 * that could otherwise be limited by a user config.
 */
if (!is.null(sConsoleLogger)) {
    const query = crypto.util.getQueryVariables();
    if ("console.level" in query) {
    // set with last value
        setLevel(
            sConsoleLogger, query["console.level"].slice(-1)[0]);
    }
    if ("console.lock" in query) {
    // set with last value
        const lock = query["console.lock"].slice(-1)[0];
        if (lock === "true") {
            lock(sConsoleLogger);
        }
    }
}

// provide public access to console logger
export const consoleLogger = sConsoleLogger;
