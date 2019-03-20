const {
    is
} = adone;

const values = require("../sources/values");
const once = require("../sources/once");

//convert a stream of arrays or streams into just a stream.
module.exports = function flatten() {
    return function (read) {
        let _read;
        return function (abort, cb) {
            if (abort) { //abort the current stream, and then stream of streams.
                _read ? _read(abort, (err) => {
                    read(err || abort, cb);
                }) : read(abort, cb);
            } else if (_read) {
                nextChunk(); 
            } else {
                nextStream(); 
            }

            function nextChunk() {
                _read(null, (err, data) => {
                    if (err === true) {
                        nextStream(); 
                    } else if (err) {
                        read(true, (abortErr) => {
                            // TODO: what do we do with the abortErr?
                            cb(err);
                        });
                    } else {
                        cb(null, data); 
                    }
                });
            }
            function nextStream() {
                _read = null;
                read(null, (end, stream) => {
                    if (end) {
                        return cb(end); 
                    }
                    if (is.array(stream) || stream && typeof stream === "object") {
                        stream = values(stream); 
                    } else if (!is.function(stream)) {
                        stream = once(stream); 
                    }
                    _read = stream;
                    nextChunk();
                });
            }
        };
    };
};

