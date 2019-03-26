const {
    is,
    util
} = adone;

export const STATE = {
    INITIAL: "initial",
    CONFIGURING: "configuring",
    CONFIGURED: "configured",
    INITIALIZING: "initializing",
    INITIALIZED: "initialized",
    RUNNING: "running",
    UNINITIALIZING: "uninitializing",
    UNINITIALIZED: "uninitialized",
    FAIL: "fail"
};

// Decorators
export const SUBSYSTEM_ANNOTATION = "subsystem";

const SubsystemDecorator = (sysInfo = {}) => (target) => {
    const info = Reflect.getMetadata(SUBSYSTEM_ANNOTATION, target);
    if (is.undefined(info)) {
        Reflect.defineMetadata(SUBSYSTEM_ANNOTATION, sysInfo, target);
    } else {
        Object.assign(info, sysInfo);
    }
};

export const SubsystemMeta = SubsystemDecorator;
export const ApplicationMeta = SubsystemDecorator;
export const MainCommandMeta = (mainCommand = {}) => (target, key, descriptor) => {
    let sysMeta = Reflect.getMetadata(SUBSYSTEM_ANNOTATION, target.constructor);
    mainCommand.handler = descriptor.value;
    if (is.undefined(sysMeta)) {
        if (target instanceof adone.app.Application) {
            sysMeta = {
                mainCommand
            };
        } else {
            sysMeta = mainCommand;
        }
        Reflect.defineMetadata(SUBSYSTEM_ANNOTATION, sysMeta, target.constructor);
    } else {
        if (target instanceof adone.app.Application) {
            sysMeta.mainCommand = mainCommand;
        } else {
            Object.assign(sysMeta, mainCommand);
        }
    }
};
export const CommandMeta = (commandInfo = {}) => (target, key, descriptor) => {
    let sysMeta = Reflect.getMetadata(SUBSYSTEM_ANNOTATION, target.constructor);
    commandInfo.handler = descriptor.value;
    if (is.undefined(sysMeta)) {
        sysMeta = {
            commands: [
                commandInfo
            ]
        };
        Reflect.defineMetadata(SUBSYSTEM_ANNOTATION, sysMeta, target.constructor);
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

const __ = adone.lazify({
    Subsystem: "./subsystem",
    Application: "./application",
    AppHelper: "./app_helper",
    logger: "./logger",
    fastLogger: "./fast_logger",
    lockfile: "./lockfile"
}, adone.asNamespace(exports), require);

// application runtime
export const runtime = {
    app: null,
    lockFiles: {},
    logger: __.logger.create({
        level: "info"
    })
};

const INTERNAL = Symbol.for("adone.app.Application#internal");

const _bootstrapApp = async (app, {
    useArgs
}) => {
    if (is.null(runtime.app)) {
        runtime.app = app;

        // From Node.js docs: SIGTERM and SIGINT have default handlers on non-Windows platforms that resets
        // the terminal mode before exiting with code 128 + signal number. If one of these signals has a
        // listener installed, its default behavior will be removed (Node.js will no longer exit).
        // So, install noop handlers to block this default behaviour.
        process.on("SIGINT", adone.noop);
        process.on("SIGTERM", adone.noop);

        const uncaughtException = (...args) => app._uncaughtException(...args);
        const unhandledRejection = (...args) => app._unhandledRejection(...args);
        const rejectionHandled = (...args) => app._rejectionHandled(...args);
        const beforeExit = () => app.stop();
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

        if (adone.is.nodejs && adone.cli.output.isTTY) {
            // Track cursor if tty mode is enabled
            await new Promise((resolve) => adone.cli.trackCursor(resolve));
        }


        app.on("exit:main", async () => {
            adone.cli.destroy();

            // Remove acquired locks on exit
            const locks = runtime.lockFiles;
            const lockFiles = Object.keys(locks);
            for (const file of lockFiles) {
                try {
                    const options = locks[file].options;
                    await locks[file].options.fs.rm(app.lockfile.getLockFile(file, options)); // eslint-disable-line
                } catch (e) {
                    //
                }
            }
        });
    }

    try {
        let code = null;

        if (useArgs) {
            const {
                app: { AppHelper }
            } = adone;

            const appHelper = new AppHelper(app);
            app.helper = appHelper;

            app._setErrorScope(true);

            const sysMeta = Reflect.getMetadata(SUBSYSTEM_ANNOTATION, app.constructor);
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

            await app.configure();

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
                console.log(`${command.getUsageMessage()}\n`);
                for (const error of errors) {
                    console.log(error.message);
                }
                await app.stop(1);
            }

            app._setErrorScope(true);
            await app.initialize();

            await app.emitParallel("before run", command);
            code = await command.execute(rest, match);
        } else {
            app._setErrorScope(true);
            await app.configure();
            await app.initialize();
            code = await app.run();
        }

        app._setErrorScope(false);

        if (is.integer(code)) {
            await app.stop(code);
            return;
        }
    } catch (err) {
        if (app._isAppErrorScope()) {
            return app.fireException(err);
        }
        console.error(adone.pretty.error(err));
        return app.stop(1);
    }
};

export const run = async (App, {
    useArgs = false
} = {}) => {
    if (is.null(runtime.app) && is.class(App)) {
        const app = new App();
        if (useArgs) {
            // mark the default main as internal to be able to distinguish internal from user-defined handlers
            app.run[INTERNAL] = true;
        }
        if (!is.application(app)) {
            console.error(adone.cli.chalk.red("Invalid application class"));
            process.exit(1);
            return;
        }

        return _bootstrapApp(app, {
            useArgs
        });
    }

    // surrogate application, use only own properties
    const _App = is.class(App) ? App.prototype : App;
    const allProps = util.entries(_App, { enumOnly: false });

    if (!is.null(runtime.app)) {
        await runtime.app.uninitialize();
        runtime.app = null;
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

    const app = new XApplication();
    for (const name of props) {
        const descriptor = Object.getOwnPropertyDescriptor(_App, name);
        Object.defineProperty(app, name, descriptor);
    }
    if (useArgs) {
        // mark the default main as internal to be able to distinguish internal from user-defined handlers
        app.run[INTERNAL] = true;
    }

    return _bootstrapApp(app, {
        useArgs
    });
};
