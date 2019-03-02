const through = require("through2");
import { createMockTransport } from "./mocks/mock-transport";

const {
    app: { logger },
    is,
    std: { fs, path, util, stream, child_process: { spawn } }
} = adone;

const helpers = exports;

/**
 * Returns a new logger.Logger instance which will invoke
 * the `write` method on each call to `.log`
 *
 * @param {function} write Write function for the specified stream
 * @returns {Logger} A logger.Logger instance
 */
helpers.createLogger = function (write, format) {
    return logger.create({
        format,
        transports: [
            createMockTransport(write)
        ]
    });
};

/**
 * Returns a new writeable stream with the specified write function.
 * @param {function} write Write function for the specified stream
 * @returns {stream.Writeable} A writeable stream instance
 */
helpers.writeable = function (write, objectMode) {
    return new stream.Writable({
        objectMode: objectMode !== false,
        write
    });
};

/**
 * Creates a new ExceptionHandler instance with a new
 * logger.Logger instance with the specified options
 *
 * @param {Object} opts Options for the logger associated
 *                 with the ExceptionHandler
 * @returns {ExceptionHandler} A new ExceptionHandler instance
 */
helpers.exceptionHandler = function (opts) {
    const l = logger.create(opts);
    return new logger.ExceptionHandler(l);
};

/**
 * Creates a new RejectionHandler instance with a new
 * Logger instance with the specified options
 *
 * @param {Object} opts Options for the logger associated
 *                 with the RejectionHandler
 * @returns {RejectionHandler} A new ExceptionHandler instance
 */
helpers.rejectionHandler = function (opts) {
    const l = logger.create(opts);
    return new logger.RejectionHandler(l);
};

/**
 * Removes all listeners to `process.on('uncaughtException')`
 * and returns an object that allows you to restore them later.
 *
 * @returns {Object} Facade to restore uncaughtException handlers.
 */
helpers.clearExceptions = function () {
    const listeners = process.listeners("uncaughtException");
    process.removeAllListeners("uncaughtException");

    return {
        restore() {
            process.removeAllListeners("uncaughtException");
            listeners.forEach((fn) => {
                process.on("uncaughtException", fn);
            });
        }
    };
};

/**
 * Removes all listeners to `process.on('unhandledRejection')`
 * and returns an object that allows you to restore them later.
 *
 * @returns {Object} Facade to restore unhandledRejection handlers.
 */
helpers.clearRejections = function () {
    const listeners = process.listeners("unhandledRejection");
    process.removeAllListeners("unhandledRejections");
  
    return {
        restore() {
            process.removeAllListeners("unhandledRejection");
            listeners.forEach((fn) => {
                process.on("unhandledRejection", fn);
            });
        }
    };
};

/**
 * Throws an exception with the specified `msg`
 * @param {String} msg Error mesage to use
 */
helpers.throw = function (msg) {
    throw new Error(msg);
};

/**
 * Causes a Promise rejection with the specified `msg`
 * @param {String} msg Error mesage to use
 */
helpers.reject = function (msg) {
    return new Promise((resolve, reject) => {
        reject(msg);
    });
};

/**
 * Attempts to unlink the specifyed `filename` ignoring errors
 * @param {String} File Full path to attempt to unlink.
 */
helpers.tryUnlink = function (filename) {
    try {
        fs.unlinkSync(filename);
    } catch (ex) { }
};

/**
 * Returns a stream that will emit data for the `filename` if it exists
 * and is capable of being opened.
 * @param  {filename} Full path to attempt to read from.
 * @returns {Stream} Stream instance to the contents of the file
 */
helpers.tryRead = function tryRead(filename) {
    const proxy = through();
    (function inner() {
        const stream = fs.createReadStream(filename)
            .once("open", () => {
                stream.pipe(proxy);
            })
            .once("error", (err) => {
                if (err.code === "ENOENT") {
                    return setImmediate(inner);
                }
                proxy.emit("error", err);
            });
    }());

    return proxy;
};

/**
 * Assumes the process structure associated with an ExceptionHandler
 * for the `obj` provided.
 * @param  {Object} obj Ordinary object to assert against.
 */
helpers.assertProcessInfo = function (obj) {
    assert.isNumber(obj.pid);
    // `process.gid` and `process.uid` do no exist on Windows.
    if (process.platform === "win32") {
        assert.isNull(obj.uid);
        assert.isNull(obj.gid);
    } else {
        assert.isNumber(obj.uid);
        assert.isNumber(obj.gid);
    }
    assert.isString(obj.cwd);
    assert.isString(obj.execPath);
    assert.isString(obj.version);
    assert.array(obj.argv);
    assert.isObject(obj.memoryUsage);
};

/**
 * Assumes the OS structure associated with an ExceptionHandler
 * for the `obj` provided.
 * @param  {Object} obj Ordinary object to assert against.
 */
helpers.assertOsInfo = function (obj) {
    assert.array(obj.loadavg);
    assert.isNumber(obj.uptime);
};

/**
 * Assumes the trace structure associated with an ExceptionHandler
 * for the `trace` provided.
 * @param  {Object} trace Ordinary object to assert against.
 */
helpers.assertTrace = function (trace) {
    trace.forEach((site) => {
        assert.isTrue(!site.column || is.number(site.column));
        assert.isTrue(!site.line || is.number(site.line));
        assert.isTrue(!site.file || is.string(site.file));
        assert.isTrue(!site.method || is.string(site.method));
        assert.isTrue(!site.function || is.string(site.function));
        assert.isTrue(is.boolean(site.native));
    });
};

/**
 * Assumes the `logger` provided is a `logger.Logger` at the specified `level`.
 * @param  {Logger} logger Logger to assert against
 * @param  {String} level Target level logger is expected at.
 */
helpers.assertLogger = function (l, level) {
    assert.instanceOf(l, logger.Logger);
    assert.isFunction(l.log);
    assert.isFunction(l.add);
    assert.isFunction(l.remove);
    assert.strictEqual(l.level, level || "info");
    Object.keys(l.levels).forEach((method) => {
        assert.isFunction(l[method]);
    });
};

/**
 * Asserts that the script located at `options.script` logs a single exception
 * (conforming to the ExceptionHandler structure) at the specified `options.logfile`.
 * @param  {Object} options Configuration for this test.
 * @returns {function} Test macro asserting that `options.script` performs the
 *                    expected behavior.
 */
helpers.assertHandleExceptions = function ({ script, logfile, message }) {
    return async function (done) {
        try {
            await forkProcess(script);
        } catch (err) { }

        fs.readFile(logfile, (err, data) => {
            helpers.tryUnlink(logfile);
            assert.isNull(err);
            data = JSON.parse(data);

            assert.isObject(data);
            helpers.assertProcessInfo(data.process);
            helpers.assertOsInfo(data.os);
            helpers.assertTrace(data.trace);
            if (message) {
                assert.isTrue(data.message.includes(`uncaughtException: ${message}`));
            }

            done();
        });
    };
};

/**
 * Asserts that the script located at `options.script` logs a single rejection
 * (conforming to the RejectionHandler structure) at the specified `options.logfile`.
 * @param  {Object} options Configuration for this test.
 * @returns {function} Test macro asserting that `options.script` performs the
 *                    expected behavior.
 */
helpers.assertHandleRejections = function (options) {
    return function (done) {
        const child = spawn("node", [options.script]);
  
        if (process.env.DEBUG) {
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stdout);
        }
  
        helpers.tryUnlink(options.logfile);
        child.on("exit", () => {
            fs.readFile(options.logfile, (err, data) => {
                assert.isNull(err);
                data = JSON.parse(data);
  
                assert.isObject(data);
                helpers.assertProcessInfo(data.process);
                helpers.assertOsInfo(data.os);
                helpers.assertTrace(data.trace);
                if (options.message) {
                    assert.isTrue(data.message.includes(`unhandledRejection: ${options.message}`));
                }
  
                done();
            });
        });
    };
};
