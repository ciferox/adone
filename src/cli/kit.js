const {
    is,
    application
} = adone;

class CliKit extends application.Subsystem {
    constructor() {
        super();
        this._bar = null;
        this._silent = false;
    }

    uninitialize() {
    }

    setProgressBar(bar) {
        this._bar = bar;
    }

    setSilent(silent) {
        this._silent = silent;
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
                schema: ` :spinner ${message}`
            };
        } else {
            options = message;
        }
        if (!this._silent) {
            this._bar = adone.runtime.term.progress(options);
            this._bar.update(0);
        }
    }

    updateProgress({ schema, message, result = null, clean = false } = {}) {
        if (!is.null(this._bar) && !this._silent) {
            if (is.string(message)) {
                schema = ` :spinner ${message}`;
            } else if (!is.string(schema)) {
                schema = " :spinner";
            }
            this._bar.setSchema(schema);
            if (is.boolean(result)) {
                if (clean) {
                    this._bar.clean = true;
                }
                this._bar.complete(result);
            }

        }
    }
}

export default new CliKit();
