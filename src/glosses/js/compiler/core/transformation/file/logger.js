const seenDeprecatedMessages = [];

export default class Logger {
    constructor(file, filename) {
        this.filename = filename;
        this.file = file;
    }

    _buildMessage(msg) {
        let parts = `[COMPILER] ${this.filename}`;
        if (msg) {
            parts += `: ${msg}`;
        }
        return parts;
    }

    warn(msg) {
        console.warn(this._buildMessage(msg));
    }

    error(msg, Constructor = Error) {
        throw new Constructor(this._buildMessage(msg));
    }

    deprecate(msg) {
        if (this.file.opts && this.file.opts.suppressDeprecationMessages) {
            return;
        }

        msg = this._buildMessage(msg);

        // already seen this message
        if (seenDeprecatedMessages.indexOf(msg) >= 0) {
            return;
        }

        // make sure we don't see it again
        seenDeprecatedMessages.push(msg);

        console.error(msg);
    }

    verbose(msg) {
        // if (verboseDebug.enabled) console.log(this._buildMessage(msg));
    }

    debug(msg) {
        // if (generalDebug.enabled) console.log(this._buildMessage(msg));
    }

    deopt(node, msg) {
        this.debug(msg);
    }
}
