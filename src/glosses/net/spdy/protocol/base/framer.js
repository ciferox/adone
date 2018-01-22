const {
    is,
    net: { spdy }
} = adone;

const { protocol: { base: { Scheduler } } } = spdy;

export default class Framer extends Scheduler {
    constructor(options) {
        super();

        this.version = null;
        this.compress = null;
        this.window = options.window;
        this.timeout = options.timeout;

        // Wait for `enablePush`
        this.pushEnabled = null;
    }

    setVersion(version) {
        this.version = version;
        this.emit("version");
    }

    setCompression(pair) {
        this.compress = new spdy.utils.LockStream(pair.compress);
    }

    enablePush(enable) {
        this.pushEnabled = enable;
        this.emit("_pushEnabled");
    }

    _checkPush(callback) {
        if (is.null(this.pushEnabled)) {
            this.once("_pushEnabled", function () {
                this._checkPush(callback);
            });
            return;
        }

        let err = null;
        if (!this.pushEnabled) {
            err = new Error("PUSH_PROMISE disabled by other side");
        }
        process.nextTick(() => {
            return callback(err);
        });
    }

    _resetTimeout() {
        if (this.timeout) {
            this.timeout.reset();
        }
    }
}
