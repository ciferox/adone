const {
    is,
    x,
    std,
    runtime: { term },
    tag,
    application
} = adone;

const {
    EXIT_SUCCESS,
    EXIT_ERROR,
    STAGE_SYMBOL,
    STATE
} = application;

// const INTERNAL = Symbol();
const REPORT = Symbol();
const ERROR_SCOPE = Symbol.for("adone.application.Application#errorScope");
const HANDLERS = Symbol();
const EXITING = Symbol();
const IS_MAIN = Symbol();
const INTERACTIVE = Symbol();

export default class Application extends application.Subsystem {
    constructor({ name = std.path.basename(process.argv[1], std.path.extname(process.argv[1])), interactive = true } = {}) {
        super({ name });

        this[EXITING] = false;
        this[IS_MAIN] = false;
        this[HANDLERS] = null;
        this[ERROR_SCOPE] = false;
        this[REPORT] = null;
        this[INTERACTIVE] = interactive;

        this.setMaxListeners(Infinity);
    }

    get isMain() {
        return this[IS_MAIN];
    }

    _setupMain() {
        // setup the main application
        // Prevent double initialization of global application instance
        // (for cases where two or more Applications run in-process, the first app will be common).
        if (!is.null(adone.runtime.app)) {
            throw new x.IllegalState("It is impossible to have several main applications");
        }
        adone.runtime.app = this;

        if (process.env.ADONE_REPORT) {
            this.enableReport();
        }


        // From Node.js docs: SIGTERM and SIGINT have default handlers on non-Windows platforms that resets
        // the terminal mode before exiting with code 128 + signal number. If one of these signals has a
        // listener installed, its default behavior will be removed (Node.js will no longer exit).
        // So, install noop handlers to block this default behaviour.
        process.on("SIGINT", adone.noop);
        process.on("SIGTERM", adone.noop);

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
        if (this[INTERACTIVE] && term.output.isTTY) {
            return new Promise((resolve) => term.trackCursor(resolve));
        }
    }

    enableReport({
        events = process.env.ADONE_REPORT_EVENTS || "exception+fatalerror+signal+apicall",
        signal = process.env.ADONE_REPORT_SIGNAL,
        filename = process.env.ADONE_REPORT_FILENAME,
        directory = process.env.ADONE_REPORT_DIRECTORY
    } = {}) {
        this[REPORT] = application.report;
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

    async run() {
        try {
            if (is.null(adone.runtime.app)) {
                await this._setupMain();
            }

            this[ERROR_SCOPE] = true;
            await this._configure();
            await this._initialize();
            const code = await this.main();
            this[ERROR_SCOPE] = false;
            if (is.integer(code)) {
                await this.exit(code);
                return;
            }
            this[STAGE_SYMBOL] = STATE.RUNNING;
        } catch (err) {
            if (this[ERROR_SCOPE]) {
                return this._fireException(err);
            }
            adone.error(err.stack || err.message || err);
            return this.exit(application.EXIT_ERROR);
        }
    }

    main() {
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
            if (sigName === "SIGINT" || sigName === "SIGTERM") {
                process.removeListener(sigName, adone.noop);
            }
        }
        return this;
    }

    async exit(code = EXIT_SUCCESS) {
        if (this[EXITING]) {
            return;
        }
        this[EXITING] = true;

        try {
            await this._uninitialize();
            this.removeProcessHandlers();
            await this.emitParallel("exit", code);
        } catch (err) {
            adone.error(err.stack || err.message || err);
            code = EXIT_ERROR;
        }

        // Only main application instance can exit process.
        if (this !== adone.runtime.app) {
            return;
        }

        await new Promise((resolve) => {
            let fds = 0;

            // end the logger & waiting for completion
            adone.runtime.logger.done(() => {
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
            term.destroy();
        }

        // Remove acquired locks on exit
        const locks = adone.private(application).locks;
        const lockFiles = Object.keys(locks);
        for (const file of lockFiles) {
            try {
                await locks[file].options.fs.rm(application.locking.getLockFile(file)); // eslint-disable-line
            } catch (e) {
                //
            }
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

    async _fireException(err) {
        let errCode;
        if (is.function(this.exception)) {
            errCode = await this.exception(err);
        } else {
            adone.error(err.stack || err.message || err);
            errCode = adone.application.EXIT_ERROR;
        }
        if (!is.integer(errCode)) {
            errCode = adone.application.EXIT_ERROR;
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
        return this.exit(EXIT_SUCCESS);
    }
}
tag.add(Application, "APPLICATION");
