const {
    is,
    util
} = adone;

export const STATE_SYMBOL = Symbol.for("application.Subsystem#state");

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

adone.lazify({
    Subsystem: "./subsystem",
    Application: "./application",
    CliApplication: "./cli_application",
    Logger: "./logger",
    report: "./report",
    locking: "./locking"
}, adone.asNamespace(exports), require);

adone.definePrivate({
    locks: {} // used by adone.application.locking
}, exports);

export const run = async (App) => {
    if (is.null(adone.runtime.app) && is.class(App)) {
        const app = new App();
        if (!is.application(app)) {
            console.error(`${adone.terminal.esc.red.open}Invalid application class (should be derivative of 'adone.application.Application')${adone.terminal.esc.red.close}`);
            process.exit(1);
            return;
        }
        return app.run();
    }

    // surrogate application, use only own properties
    const _App = is.class(App) ? App.prototype : App;
    const allProps = util.entries(_App, { onlyEnumerable: false });

    if (!is.null(adone.runtime.app)) {
        await adone.runtime.app._uninitialize();
        adone.runtime.app = null;
    }

    class XApplication extends adone.application.Application { }

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

    return app.run();
};

export const runCli = async (App, ignoreArgs = false) => {
    if (is.null(adone.runtime.app) && is.class(App)) {
        const app = new App();
        if (!is.cliApplication(app)) {
            console.error(`${adone.terminal.esc.red.open}Invalid application class (should be derivative of 'adone.application.Application')${adone.terminal.esc.red.close}`);
            process.exit(1);
            return;
        }
        return app.run({ ignoreArgs });
    }

    // surrogate application, use only own properties
    const _App = is.class(App) ? App.prototype : App;
    const allProps = util.entries(_App, { onlyEnumerable: false });

    if (!is.null(adone.runtime.app)) {
        await adone.runtime.app._uninitialize();
        adone.runtime.app = null;
    }

    // redefine argv
    if (is.array(adone.__argv__)) {
        process.argv = adone.__argv__;
        delete adone.__argv__;
    }

    class XApplication extends adone.application.CliApplication { }

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

    return app.run({ ignoreArgs });
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
