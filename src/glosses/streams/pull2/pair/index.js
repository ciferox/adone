const {
    is
} = adone;

//a pair of pull streams where one drains from the other
module.exports = function () {
    let _read; let waiting;
    const sink = function (read) {
        if (!is.function(read)) {
            throw new Error("read must be function");
        }

        if (_read) {
            throw new Error("already piped");
        }
        _read = read;
        if (waiting) {
            const _waiting = waiting;
            waiting = null;
            _read.apply(null, _waiting);
        }
    };
    const source = function (abort, cb) {
        if (_read) {
            _read(abort, cb);
        } else {
            waiting = [abort, cb];
        }
    };

    return {
        source, sink
    };
};

adone.lazify({
    duplex: "./duplex"
}, module.exports, require);