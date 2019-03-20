
const Decode = require("string_decoder").StringDecoder;

module.exports = function (enc) {
    const decoder = new Decode(enc); let ended;
    return function (read) {
        return function (abort, cb) {
            if (ended) {
                return cb(ended); 
            }
            read(abort, (end, data) => {
                ended = end;
                if (end === true) {
                    if (data = decoder.end()) {
                        cb(null, data); 
                    } else {
                        cb(true); 
                    }
                } else if (end && (end !== true)) {
                    cb(end); 
                } else {
                    cb(null, decoder.write(data)); 
                }
            });
        };
    };
};
