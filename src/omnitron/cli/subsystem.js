const {
    application,
    is,
    omnitron
} = adone;

export default class Subsystem extends application.Subsystem {
    async configure() {
        this._bar = null;
    }

    async _connectToLocal() {
        await omnitron.dispatcher.connectLocal({
            forceStart: false
        });
    }

    uninitialize() {
        return omnitron.dispatcher.disconnect();
    }

    _createProgress(message) {
        if (!this.silent) {
            this.bar = adone.runtime.term.progress({
                schema: ` :spinner ${message}`
            });
            this.bar.update(0);
        }
    }

    _updateProgress(message, result = null, clean = false) {
        if (!is.null(this.bar) && !this.silent) {
            if (is.plainObject(message)) {
                this.bar.setSchema(message.schema);
            } else {
                this.bar.setSchema(` :spinner ${message}`);
            }

            if (is.boolean(result)) {
                if (clean) {
                    this.bar.clean = true;
                }
                this.bar.complete(result);
            }

        }
    }
}
