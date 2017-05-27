const streamsOpts = { objectMode: true };

export default class Store {
    constructor() {

        this._inflights = {};
    }

    put(packet, cb) {
        this._inflights[packet.messageId] = packet;

        if (cb) {
            cb();
        }

        return this;
    }

    createStream() {
        const stream = new adone.std.stream.Readable(streamsOpts);
        const inflights = this._inflights;
        const ids = Object.keys(this._inflights);
        let destroyed = false;
        let i = 0;

        stream._read = function () {
            if (!destroyed && i < ids.length) {
                this.push(inflights[ids[i++]]);
            } else {
                this.push(null);
            }
        };

        stream.destroy = function () {
            if (destroyed) {
                return;
            }

            const self = this;

            destroyed = true;

            process.nextTick(() => {
                self.emit("close");
            });
        };

        return stream;
    }

    del(packet, cb) {
        packet = this._inflights[packet.messageId];
        if (packet) {
            delete this._inflights[packet.messageId];
            cb(null, packet);
        } else if (cb) {
            cb(new Error("missing packet"));
        }

        return this;
    }

    get(packet, cb) {
        packet = this._inflights[packet.messageId];
        if (packet) {
            cb(null, packet);
        } else if (cb) {
            cb(new Error("missing packet"));
        }

        return this;
    }

    close(cb) {
        this._inflights = null;
        if (cb) {
            cb();
        }
    }
}
