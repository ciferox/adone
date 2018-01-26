const {
    noop
} = adone;

export default class Socket extends adone.std.events.EventEmitter { // must be a native one
    constructor(options) {
        super();
        options = options || {};

        if (options.proto === "https") {
            this.authorized = true;
        }

        this.writable = true;
        this.readable = true;
        this.destroyed = false;

        this.setNoDelay = noop;
        this.setKeepAlive = noop;
        this.resume = noop;

        // totalDelay that has already been applied to the current
        // request/connection, timeout error will be generated if
        // it is timed-out.
        this.totalDelayMs = 0;
        // Maximum allowed delay. Null means unlimited.
        this.timeoutMs = null;
    }

    setTimeout(timeoutMs, fn) {
        this.timeoutMs = timeoutMs;
        this.timeoutFunction = fn;
    }

    applyDelay(delayMs) {
        this.totalDelayMs += delayMs;

        if (this.timeoutMs && this.totalDelayMs > this.timeoutMs) {
            if (this.timeoutFunction) {
                this.timeoutFunction();
            } else {
                this.emit("timeout");
            }
        }

    }

    getPeerCertificate() {
        return Buffer.from((Math.random() * 10000 + Date.now()).toString()).toString("base64");
    }

    destroy() {
        this.destroyed = true;
        this.readable = this.writable = false;
    }
}

