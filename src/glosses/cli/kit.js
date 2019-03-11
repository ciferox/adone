const {
    is,
    cli,
    runtime: { terminal }
} = adone;

const { chalkify, prompt } = cli;

const COLOR_SCHEME = Symbol();
const BAR = Symbol();
const SILENT = Symbol();
const ACTIVE_PROMPT = Symbol();

const DEFAULT_COLOR_SCHEME = adone.lazify({
    primary: () => chalkify("#388E3C"),
    secondary: () => chalkify("#2196F3"),
    accent: () => chalkify("#7C4DFF"),
    focus: () => chalkify("#009688"),
    inactive: () => chalkify("#616161"),
    error: () => chalkify("#D32F2F"),
    warn: () => chalkify("#FF5722"),
    info: () => chalkify("#FFEB3B"),
    notice: () => chalkify("#FFEB3B")
}, null);

export default class CLIKit {
    constructor() {
        this[BAR] = null;
        this[SILENT] = false;
        this[ACTIVE_PROMPT] = null;
        this[COLOR_SCHEME] = DEFAULT_COLOR_SCHEME;
    }

    destroy() {
        if (!is.null(this[ACTIVE_PROMPT])) {
            // Make sure new prompt start on a newline when closing
            this[ACTIVE_PROMPT].forceClose();
        }
    }

    get style() {
        return this[COLOR_SCHEME];
    }

    setColorScheme(scheme) {
        this[COLOR_SCHEME] = scheme;
    }

    setProgressBar(bar) {
        this[BAR] = bar;
    }

    setSilent(silent) {
        this[SILENT] = silent;
    }

    async observe(what, taskManager) {
        if (is.array(what)) {
            for (const w of what) {
                this.observe(w, taskManager);
            }

            return;
        }

        switch (what) {
            case "progress": {
                this.createProgress("preparing");
                await taskManager.onNotification("progress", (sender, name, info) => {
                    this.updateProgress(info);
                });
                break;
            }
            default: {
                if (what.startsWith("log") && is.function(adone[what])) {
                    await taskManager.onNotification(what, (sender, name, ...args) => {
                        adone[what](...args);
                    });
                }
                break;
            }
        }
    }

    async connect() {
        if (!adone.omnitron.dispatcher.isConnected()) {
            await adone.omnitron.dispatcher.connectLocal({
                forceStart: false
            });

            // Add dispatcher as subsystem.
            this.addSubsystem({
                name: "dispatcher",
                bind: true,
                subsystem: adone.omnitron.dispatcher
            });
            await this.configureSubsystem("dispatcher");
            await this.initializeSubsystem("dispatcher");
        }
    }

    createProgress(message) {
        let options;
        if (is.string(message)) {
            options = {
                schema: `:spinner ${message}`
            };
        } else {
            options = message;
        }
        if (!this[SILENT]) {
            this[BAR] = terminal.progress(options);
            this[BAR].update(0);
        }
    }

    updateProgress({ clean = false, schema, message, status } = {}) {
        if (is.null(this[BAR])) {
            this.createProgress(message);
        }
        if (!this[SILENT]) {
            if (is.string(message)) {
                schema = `:spinner ${message}`;
            } else if (!is.string(schema)) {
                schema = ":spinner";
            }
            this[BAR].setSchema(schema);
            if (is.boolean(status) || is.string(status)) {
                if (clean) {
                    this[BAR].clean = true;
                }
                this[BAR].complete(status);
            }
        }
    }

    async prompt(questions, customTerminal) {
        const p = new prompt.Manager(customTerminal || terminal);
        this[ACTIVE_PROMPT] = p;
        const result = await p.run(questions);
        this[ACTIVE_PROMPT] = null;
        return result;
    }

    progress(options) {
        return new cli.Progress(options);
    }

    separator(value) {
        return new cli.prompt.Separator(value);
    }
}
