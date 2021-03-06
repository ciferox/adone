const {
    is,
    app: { getSubsystemMeta },
    util
} = adone;

const INTERNAL = Symbol.for("adone.app.Application#internal");

const _bootstrapApp = async (app, {
    useArgs,
    version,
    ...restOptions
}) => {
    if (is.null(adone.__app__)) {
        adone.__app__ = app;

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

        if (adone.is.nodejs && process.stdout.isTTY && process.stdin.isTTY) {
            // Track cursor if tty mode is enabled
            await new Promise((resolve) => adone.cli.trackCursor(resolve));
        }

        app.on("exit:main", async () => {
            adone.cli.destroy();
        });
    }

    try {
        let code = null;

        if (useArgs) {
            const {
                app: { AppHelper }
            } = adone;

            const appHelper = new AppHelper(app, { version });
            app.helper = appHelper;

            app._setErrorScope(true);

            const sysMeta = getSubsystemMeta(app.constructor);
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

            await app.configure(restOptions);

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
                    console.error(adone.pretty.error(error));
                }
                await app.stop(1);
            }

            app._setErrorScope(true);
            await app.initialize(restOptions);

            await app.emitParallel("before run", command);
            code = await command.execute(rest, match);
        } else {
            app._setErrorScope(true);
            await app.configure(restOptions);
            await app.initialize(restOptions);
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

export default async (App, {
    useArgs = false,
    version,
    ...restOptions
} = {}) => {
    if (is.null(adone.__app__) && is.class(App)) {
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
            useArgs,
            version,
            ...restOptions
        });
    }

    // surrogate application, use only own properties
    const _App = is.class(App) ? App.prototype : App;
    const allProps = util.entries(_App, { enumOnly: false });

    if (!is.null(adone.__app__)) {
        await adone.__app__.uninitialize();
        adone.__app__.removeProcessHandlers();
        adone.__app__ = null;
    }

    // redefine argv
    if (is.array(adone.__argv__)) {
        process.argv = adone.__argv__;
        delete adone.__argv__;
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
    for (const prop of props) {
        const descriptor = Object.getOwnPropertyDescriptor(_App, prop);
        Object.defineProperty(app, prop, descriptor);
    }
    if (useArgs) {
        // mark the default main as internal to be able to distinguish internal from user-defined handlers
        app.run[INTERNAL] = true;
    }

    return _bootstrapApp(app, {
        useArgs,
        version,
        ...restOptions
    });
};
