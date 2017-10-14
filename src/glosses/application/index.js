const {
    is,
    util
} = adone;

export const SUBSYSTEMS_SYMBOL = Symbol();
export const STAGE_SYMBOL = Symbol();

export const STATE = {
    CREATED: 0,
    CONFIGURING: 1,
    CONFIGURED: 2,
    INITIALIZING: 3,
    INITIALIZED: 4,
    RUNNING: 5,
    UNINITIALIZING: 6,
    UNINITIALIZED: 7
};

export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;

adone.lazify({
    Subsystem: "./subsystem",
    Application: "./application",
    Logger: "./logger",
    report: "./report",
    locking: "./locking"
}, adone.asNamespace(exports), require);

adone.definePrivate({
    locks: {} // used by adone.application.locking
}, exports);

export const run = async (App, ignoreArgs = false) => {
    if (is.null(adone.runtime.app) && is.class(App)) {
        const app = new App();
        if (!is.application(app)) {
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
