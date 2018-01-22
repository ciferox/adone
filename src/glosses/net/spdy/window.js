const debug = {
    server: require("debug")("spdy:window:server"),
    client: require("debug")("spdy:window:client")
};

const {
    is,
    event
} = adone;

class Side extends event.Emitter {
    constructor(window, name, options) {
        super();

        this.name = name;
        this.window = window;
        this.current = options.size;
        this.max = options.size;
        this.limit = options.max;
        this.lowWaterMark = is.undefined(options.lowWaterMark)
            ? this.max / 2
            : options.lowWaterMark;

        this._refilling = false;
        this._refillQueue = [];
    }

    setMax(max) {
        this.window.debug("id=%d side=%s setMax=%d",
            this.window.id,
            this.name,
            max);
        this.max = max;
        this.lowWaterMark = this.max / 2;
    }

    updateMax(max) {
        const delta = max - this.max;
        this.window.debug("id=%d side=%s updateMax=%d delta=%d",
            this.window.id,
            this.name,
            max,
            delta);

        this.max = max;
        this.lowWaterMark = max / 2;

        this.update(delta);
    }

    setLowWaterMark(lwm) {
        this.lowWaterMark = lwm;
    }

    update(size, callback) {
        // Not enough space for the update, wait for refill
        if (size <= 0 && callback && this.isEmpty()) {
            this.window.debug("id=%d side=%s wait for refill=%d [%d/%d]",
                this.window.id,
                this.name,
                -size,
                this.current,
                this.max);
            this._refillQueue.push({
                size,
                callback
            });
            return;
        }

        this.current += size;

        if (this.current > this.limit) {
            this.emit("overflow");
            return;
        }

        this.window.debug("id=%d side=%s update by=%d [%d/%d]",
            this.window.id,
            this.name,
            size,
            this.current,
            this.max);

        // Time to send WINDOW_UPDATE
        if (size < 0 && this.isDraining()) {
            this.window.debug("id=%d side=%s drained", this.window.id, this.name);
            this.emit("drain");
        }

        // Time to write
        if (size > 0 && this.current > 0 && this.current <= size) {
            this.window.debug("id=%d side=%s full", this.window.id, this.name);
            this.emit("full");
        }

        this._processRefillQueue();

        if (callback) {
            process.nextTick(callback);
        }
    }

    getCurrent() {
        return this.current;
    }

    getMax() {
        return this.max;
    }

    getDelta() {
        return this.max - this.current;
    }

    isDraining() {
        return this.current <= this.lowWaterMark;
    }

    isEmpty() {
        return this.current <= 0;
    }

    _processRefillQueue() {
        // Prevent recursion
        if (this._refilling) {
            return;
        }
        this._refilling = true;

        while (this._refillQueue.length > 0) {
            const item = this._refillQueue[0];

            if (this.isEmpty()) {
                break;
            }

            this.window.debug("id=%d side=%s refilled for size=%d",
                this.window.id,
                this.name,
                -item.size);

            this._refillQueue.shift();
            this.update(item.size, item.callback);
        }

        this._refilling = false;
    }
}

export default class Window {
    constructor(options) {
        this.id = options.id;
        this.isServer = options.isServer;
        this.debug = this.isServer ? debug.server : debug.client;

        this.recv = new Side(this, "recv", options.recv);
        this.send = new Side(this, "send", options.send);
    }

    clone(id) {
        return new Window({
            id,
            isServer: this.isServer,
            recv: {
                size: this.recv.max,
                max: this.recv.limit,
                lowWaterMark: this.recv.lowWaterMark
            },
            send: {
                size: this.send.max,
                max: this.send.limit,
                lowWaterMark: this.send.lowWaterMark
            }
        });
    }
}
