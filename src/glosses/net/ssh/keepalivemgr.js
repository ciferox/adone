export default class Manager {
    constructor(interval, streamInterval, kaCountMax) {
        const streams = this._streams = [];
        this._timer = undefined;
        this._timerInterval = interval;
        this._timerfn = () => {
            const now = Date.now();
            for (let i = 0, len = streams.length, s, last; i < len; ++i) {
                s = streams[i];
                last = s._kalast;
                if (last && (now - last) >= streamInterval) {
                    if (++s._kacnt > kaCountMax) {
                        const err = new Error("Keepalive timeout");
                        err.level = "client-timeout";
                        s.emit("error", err);
                        s.disconnect();
                        adone.util.spliceOne(streams, i);
                        --i;
                        len = streams.length;
                    } else {
                        s._kalast = now;
                        // XXX: if the server ever starts sending real global requests to the
                        //            client, we will need to add a dummy callback here to keep the
                        //            correct reply order
                        s.ping();
                    }
                }
            }
        };
    }

    start() {
        if (this._timer) {
            this.stop();
        }
        this._timer = setInterval(this._timerfn, this._timerInterval);
    }

    stop() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }

    add(stream) {
        const streams = this._streams;
        const resetKA = () => {
            stream._kalast = Date.now();
            stream._kacnt = 0;
        };

        stream.once("end", () => {
            this.remove(stream);
        }).on("packet", resetKA);

        streams[streams.length] = stream;

        resetKA();

        if (!this._timer) {
            this.start();
        }
    }

    remove(stream) {
        const streams = this._streams;
        const index = streams.indexOf(stream);
        if (index > -1) {
            adone.util.spliceOne(streams, index);
        }
        if (!streams.length) {
            this.stop();
        }
    }
}
