const {
    is,
    util
} = adone;

export const STATE = {
    INITIAL: 0,
    CONFIGURING: 1,
    CONFIGURED: 2,
    INITIALIZING: 3,
    INITIALIZED: 4,
    RUNNING: 5,
    UNINITIALIZING: 6,
    UNINITIALIZED: 7,
    FAILED: 8
};

export const humanizeState = (state) => {
    switch (state) {
        case STATE.INITIAL: {
            return "initial";
        }
        case STATE.CONFIGURING: {
            return "configuring";
        }
        case STATE.CONFIGURED: {
            return "configured";
        }
        case STATE.INITIALIZING: {
            return "initializing";
        }
        case STATE.INITIALIZED: {
            return "initialized";
        }
        case STATE.RUNNING: {
            return "running";
        }
        case STATE.UNINITIALIZING: {
            return "uninitializing";
        }
        case STATE.UNINITIALIZED: {
            return "uninitialized";
        }
        case STATE.FAILED: {
            return "failed";
        }
    }
};

export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;

// Decorators
export const SUBSYSTEM_ANNOTATION = "subsystem";

const SubsystemDecorator = (sysInfo = {}) => (target) => {
    const info = adone.meta.reflect.getMetadata(SUBSYSTEM_ANNOTATION, target);
    if (is.undefined(info)) {
        adone.meta.reflect.defineMetadata(SUBSYSTEM_ANNOTATION, sysInfo, target);
    } else {
        Object.assign(info, sysInfo);
    }
};

export const SubsystemMeta = SubsystemDecorator;
export const ApplicationMeta = SubsystemDecorator;
export const MainCommandMeta = (mainCommand = {}) => (target, key, descriptor) => {
    let sysMeta = adone.meta.reflect.getMetadata(SUBSYSTEM_ANNOTATION, target.constructor);
    mainCommand.handler = descriptor.value;
    if (is.undefined(sysMeta)) {
        if (target instanceof adone.app.Application) {
            sysMeta = {
                mainCommand
            };
        } else {
            sysMeta = mainCommand;
        }
        adone.meta.reflect.defineMetadata(SUBSYSTEM_ANNOTATION, sysMeta, target.constructor);
    } else {
        if (target instanceof adone.app.Application) {
            sysMeta.mainCommand = mainCommand;
        } else {
            Object.assign(sysMeta, mainCommand);
        }
    }
};
export const CommandMeta = (commandInfo = {}) => (target, key, descriptor) => {
    let sysMeta = adone.meta.reflect.getMetadata(SUBSYSTEM_ANNOTATION, target.constructor);
    commandInfo.handler = descriptor.value;
    if (is.undefined(sysMeta)) {
        sysMeta = {
            commands: [
                commandInfo
            ]
        };
        adone.meta.reflect.defineMetadata(SUBSYSTEM_ANNOTATION, sysMeta, target.constructor);
    } else {
        if (!is.array(sysMeta.commands)) {
            sysMeta.commands = [
                commandInfo
            ];
        } else {
            sysMeta.commands.push(commandInfo);
        }
    }
};

adone.lazify({
    Subsystem: "./subsystem",
    Application: "./application",
    AppHelper: "./app_helper",
    logger: "./logger",
    fastLogger: "./fast_logger",
    report: "./report",
    lockfile: "./lockfile"
}, adone.asNamespace(exports), require);

adone.definePrivate({
    locks: {} // used by adone.app.lockfile
}, exports);

export const configureReport = ({
    events = process.env.ADONE_REPORT_EVENTS || "exception+fatalerror+signal+apicall",
    signal = process.env.ADONE_REPORT_SIGNAL,
    filename = process.env.ADONE_REPORT_FILENAME,
    directory = process.env.ADONE_REPORT_DIRECTORY
} = {}) => {
    const {
        app: { report }
    } = adone;
    if (events) {
        report.setEvents(events);
    }
    if (signal) {
        report.setSignal(signal);
    }
    if (filename) {
        report.setFileName(filename);
    }
    if (directory) {
        report.setDirectory(directory);
    }
};

const INTERNAL = Symbol.for("adone.app.Application#internal");

const _bootstrapApp = async (app, {
    useArgs
}) => {
    if (is.null(adone.runtime.app)) {
        // setup the main application
        // Prevent double initialization of global application instance
        // (for cases where two or more Applications run in-process, the first app will be common).
        if (!is.null(adone.runtime.app)) {
            throw new adone.error.IllegalState("It is impossible to have several main applications");
        }
        adone.runtime.app = app;

        if (process.env.ADONE_ENABLE_REPORT) {
            adone.app.configureReport();
        }

        // From Node.js docs: SIGTERM and SIGINT have default handlers on non-Windows platforms that resets
        // the terminal mode before exiting with code 128 + signal number. If one of these signals has a
        // listener installed, its default behavior will be removed (Node.js will no longer exit).
        // So, install noop handlers to block this default behaviour.
        process.on("SIGINT", adone.noop);
        process.on("SIGTERM", adone.noop);

        const uncaughtException = (...args) => app._uncaughtException(...args);
        const unhandledRejection = (...args) => app._unhandledRejection(...args);
        const rejectionHandled = (...args) => app._rejectionHandled(...args);
        const beforeExit = () => app.exit();
        const signalExit = (sigName) => app._signalExit(sigName);
        app._setHandlers({
            uncaughtException,
            unhandledRejection,
            rejectionHandled,
            beforeExit,
            signalExit
        });
        process.on("uncaughtExectption", uncaughtException);
        process.on("unhandledRejection", unhandledRejection);
        process.on("rejectionHandled", rejectionHandled);
        process.on("beforeExit", beforeExit);

        app._setAsMain();

        // Initialize realm
        await adone.realm.getManager();

        // Track cursor if interactive application (by default) and if tty mode
        if (app.isInteractiveModeEnabled && adone.runtime.term.output.isTTY) {
            await new Promise((resolve) => adone.runtime.term.trackCursor(resolve));
        }
    }

    try {
        let code = null;

        if (useArgs) {
            const {
                app: { AppHelper },
                meta: { reflect }
            } = adone;

            const appHelper = new AppHelper(app);
            app.helper = appHelper;
            
            app._setErrorScope(true);

            const sysMeta = reflect.getMetadata(SUBSYSTEM_ANNOTATION, app.constructor);
            if (sysMeta) {
                if (sysMeta.mainCommand) {
                    appHelper.defineMainCommand(sysMeta.mainCommand);
                }

                if (is.array(sysMeta.commandsGroups)) {
                    for (const group of sysMeta.commandsGroups) {
                        appHelper.defineCommandsGroup(group);
                    }
                }

                if (is.array(sysMeta.optionsGroups)) {
                    for (const group of sysMeta.optionsGroups) {
                        appHelper.defineOptionsGroup(group);
                    }
                }
            }

            await app._configure();

            if (sysMeta) {
                if (is.array(sysMeta.commands)) {
                    for (const command of sysMeta.commands) {
                        appHelper.defineCommand(command);
                    }
                }

                if (is.array(sysMeta.options)) {
                    for (const option of sysMeta.options) {
                        appHelper.defineOption(option);
                    }
                }

                if (is.array(sysMeta.subsystems)) {
                    for (const ss of sysMeta.subsystems) {
                        // eslint-disable-next-line
                        await appHelper.defineCommandFromSubsystem({
                            ...ss,
                            lazily: true
                        });
                    }
                }
            }

            app._setErrorScope(false);

            let command = appHelper.mainCommand;
            let errors = [];
            let rest = [];
            let match = null;
            ({ command, errors, rest, match } = await appHelper.parseArgs());

            if (errors.length) {
                console.log(`${escape(command.getUsageMessage())}\n`);
                for (const error of errors) {
                    console.log(escape(error.message));
                }
                await app.exit(app.EXIT_ERROR);
            }

            app._setErrorScope(true);
            await app._initialize();

            await app.emitParallel("before run", command);
            code = await command.execute(rest, match);
        } else {
            app._setErrorScope(true);
            await app._configure();
            await app._initialize();
            code = await app.main();    
        }

        app._setErrorScope(false);

        if (is.integer(code)) {
            await app.exit(code);
            return;
        }
        await app.setState(STATE.RUNNING);
    } catch (err) {
        if (app._isAppErrorScope()) {
            return app._fireException(err);
        }
        console.error(err.stack || err.message || err);
        return app.exit(app.EXIT_ERROR);
    }
};

export const run = async (App, {
    useArgs = false
} = {}) => {
    if (is.null(adone.runtime.app) && is.class(App)) {
        if (useArgs) {
            // mark the default main as internal to be able to distinguish internal from user-defined handlers
            App.prototype.main[INTERNAL] = true;
        }
        const app = new App();
        if (!is.application(app)) {
            console.error(`${adone.terminal.esc.red.open}Invalid application class (should be derivative of 'adone.app.Application')${adone.terminal.esc.red.close}`);
            process.exit(1);
            return;
        }

        return _bootstrapApp(app, {
            useArgs
        });
    }

    // surrogate application, use only own properties
    const _App = is.class(App) ? App.prototype : App;
    const allProps = util.entries(_App, { onlyEnumerable: false });

    if (!is.null(adone.runtime.app)) {
        await adone.runtime.app._uninitialize();
        adone.runtime.app = null;
    }

    if (useArgs) {
        // redefine argv
        if (is.array(adone.__argv__)) {
            process.argv = adone.__argv__;
            delete adone.__argv__;
        }
    }

    class XApplication extends adone.app.Application { }

    const props = [];

    for (const [name, value] of allProps) {
        if (is.function(value)) {
            XApplication.prototype[name] = value;
        } else {
            props.push(name);
        }
    }

    for (const s of Object.getOwnPropertySymbols(_App)) {
        XApplication.prototype[s] = App.prototype[s];
    }

    if (useArgs) {
        // mark the default main as internal to be able to distinguish internal from user-defined handlers
        App.prototype.main[INTERNAL] = true;
    }

    const app = new XApplication();
    for (const name of props) {
        const descriptor = Object.getOwnPropertyDescriptor(_App, name);
        Object.defineProperty(app, name, descriptor);
    }

    return _bootstrapApp(app, {
        useArgs
    });
};

export const restAsOptions = (args) => {
    const map = {};
    let lastArg = null;
    for (let arg of args) {
        if (arg.match(/^--[\w-]+=.+$/)) {
            const i = arg.indexOf("=");
            map[adone.text.toCamelCase(arg.slice(2, i))] = arg.slice(i + 1);
            continue;
        }
        if (arg.startsWith("-")) {
            arg = arg.slice(arg[1] === "-" ? 2 : 1);
            if (lastArg) {
                map[lastArg] = true;
            }
            lastArg = adone.text.toCamelCase(arg);
        } else {
            map[lastArg] = arg;
            lastArg = null;
        }
    }
    return map;
};
