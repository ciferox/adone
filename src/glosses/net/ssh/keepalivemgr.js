import { spliceOne } from "./utils";

function Manager(interval, streamInterval, kaCountMax) {
    let streams = this._streams = [];
    this._timer = undefined;
    this._timerInterval = interval;
    this._timerfn = function() {
        let now = Date.now();
        for (let i = 0, len = streams.length, s, last; i < len; ++i) {
            s = streams[i];
            last = s._kalast;
            if (last && (now - last) >= streamInterval) {
                if (++s._kacnt > kaCountMax) {
                    let err = new Error("Keepalive timeout");
                    err.level = "client-timeout";
                    s.emit("error", err);
                    s.disconnect();
                    spliceOne(streams, i);
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

Manager.prototype.start = function() {
    if (this._timer)
        this.stop();
    this._timer = setInterval(this._timerfn, this._timerInterval);
};

Manager.prototype.stop = function() {
    if (this._timer) {
        clearInterval(this._timer);
        this._timer = undefined;
    }
};

Manager.prototype.add = function(stream) {
    let streams = this._streams;
    let self = this;

    stream.once("end", function() {
        self.remove(stream);
    }).on("packet", resetKA);

    streams[streams.length] = stream;

    resetKA();

    if (!this._timer)
        this.start();

    function resetKA() {
        stream._kalast = Date.now();
        stream._kacnt = 0;
    }
};

Manager.prototype.remove = function(stream) {
    let streams = this._streams;
    let index = streams.indexOf(stream);
    if (index > -1)
        spliceOne(streams, index);
    if (!streams.length)
        this.stop();
};

export default Manager;
