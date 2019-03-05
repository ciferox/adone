

function id(e) {
    return e; 
}
const prop = require("../util/prop");

module.exports = function map(mapper) {
    if (!mapper) {
        return id; 
    }
    mapper = prop(mapper);
    return function (read) {
        return function (abort, cb) {
            read(abort, (end, data) => {
                try {
                    data = !end ? mapper(data) : null;
                } catch (err) {
                    return read(err, () => {
                        return cb(err);
                    });
                }
                cb(end, data);
            });
        };
    };
};
