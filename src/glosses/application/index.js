const {
    is,
    util
} = adone;

export const SUBSYSTEMS_SYMBOL = Symbol();
export const STAGE_SYMBOL = Symbol();

export const STAGE_NEW = 0;
export const STAGE_CONFIGURING = 1;
export const STAGE_CONFIGURED = 2;
export const STAGE_INITIALIZING = 3;
export const STAGE_INITIALIZED = 4;
export const STAGE_RUNNING = 5;
export const STAGE_UNINITIALIZING = 6;
export const STAGE_UNINITIALIZED = 7;

export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;

adone.lazify({
    Subsystem: "./subsystem",
    Application: "./application",
    Logger: "./logger",
    report: "./report"
}, adone.asNamespace(exports), require);

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

    for (const s of Object.getOwnPropertySymbols(App.prototype)) {
        XApplication.prototype[s] = App.prototype[s];
    }

    const app = new XApplication();
    for (const name of props) {
        const descriptor = Object.getOwnPropertyDescriptor(_App, name);
        Object.defineProperty(app, name, descriptor);
    }

    return app.run({ ignoreArgs });
};
