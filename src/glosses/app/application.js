const {
    is,
    std,
    runtime: { term },
    tag,
    app,
    util
} = adone;

const {
    EXIT_SUCCESS,
    EXIT_ERROR,
    STATE
} = app;

const ERROR_SCOPE = Symbol.for("adone.app.Application#errorScope");
const HANDLERS = Symbol();
const EXITING = Symbol();
const IS_MAIN = Symbol();
const INTERACTIVE = Symbol();
const EXIT_SIGNALS = Symbol();

export default class Application extends app.Subsystem {
    constructor({ name = std.path.basename(process.argv[1], std.path.extname(process.argv[1])), interactive = true } = {}) {
        super({ name });

        this[EXITING] = false;
        this[IS_MAIN] = false;
        this[HANDLERS] = null;
        this[ERROR_SCOPE] = false;
        this[INTERACTIVE] = interactive;
        this[EXIT_SIGNALS] = null;

        this.setRoot(this);
        this.setMaxListeners(Infinity);
    }

    get isMain() {
        return this[IS_MAIN];
    }

    get isInteractiveModeEnabled() {
        return this[INTERACTIVE];
    }

    main() {
    }

    exitOnSignal(...names) {
        for (const sigName of names) {
            if (is.null(this[EXIT_SIGNALS])) {
                this[EXIT_SIGNALS] = [];
            }
            if (this[EXIT_SIGNALS].includes(sigName)) {
                continue;
            }
            this[EXIT_SIGNALS].push(sigName);
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
            switch (this.state) {
                // initializing?
                case STATE.INITIALIZED:
                case STATE.RUNNING:
                    await this._uninitialize();
            }
            this.removeProcessHandlers();
            await this.emitParallel("exit", code);
        } catch (err) {
            console.error(err.stack || err.message || err);
            code = EXIT_ERROR;
        }

        // Only main application instance can exit process.
        if (this !== adone.runtime.app) {
            return;
        }

        adone.runtime.logger.close();

        if (this[IS_MAIN]) {
            term.destroy();
        }

        // Remove acquired locks on exit
        const locks = adone.private(app).locks;
        const lockFiles = Object.keys(locks);
        for (const file of lockFiles) {
            try {
                await locks[file].options.fs.rm(app.lockfile.getLockFile(file)); // eslint-disable-line
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
        if (is.array(this[EXIT_SIGNALS])) {
            for (const sigName of this[EXIT_SIGNALS]) {
                process.removeListener(sigName, this[HANDLERS].signalExit);
            }
        }
    }

    async _fireException(err) {
        let errCode;
        if (is.function(this.error)) {
            errCode = await this.error(err);
        } else {
            console.error(err.stack || err.message || err);
            errCode = adone.app.EXIT_ERROR;
        }
        if (!is.integer(errCode)) {
            errCode = adone.app.EXIT_ERROR;
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

    _signalExit(sigName) {
        return this.exit(128 + util.signalNameToCode(sigName));
    }

    // Helper methods used in bootstraping code.
    
    _setAsMain() {
        this[IS_MAIN] = true;        
    }

    _setHandlers(handlers) {
        this[HANDLERS] = handlers;
    }

    _setErrorScope(appScope) {
        this[ERROR_SCOPE] = appScope;
    }

    _isAppErrorScope() {
        return this[ERROR_SCOPE];
    }
}
tag.add(Application, "APPLICATION");
