
module.exports = function () {
    let _read; let _cb; let abortCb; let _end;

    const read = function (end, cb) {
        if (!_read) {
            if (end) {
                _end = end;
                abortCb = cb;
            } else {
                _cb = cb; 
            }
        } else {
            _read(end, cb); 
        }
    };
    read.resolve = function (read) {
        if (_read) {
            throw new Error("already resolved"); 
        }
        _read = read;
        if (!_read) {
            throw new Error(`no read cannot resolve!${_read}`); 
        }
        if (_cb) {
            read(null, _cb); 
        }
        if (abortCb) {
            read(_end, abortCb); 
        }
    };
    read.abort = function (err) {
        read.resolve((_, cb) => {
            cb(err || true);
        });
    };
    return read;
};

