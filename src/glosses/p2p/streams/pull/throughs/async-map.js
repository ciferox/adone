

function id(e) {
    return e; 
}
const prop = require("../util/prop");

module.exports = function asyncMap(map) {
    if (!map) {
        return id; 
    }
    map = prop(map);
    let busy = false; let abortCb; let aborted;
    return function (read) {
        return function next(abort, cb) {
            if (aborted) {
                return cb(aborted); 
            }
            if (abort) {
                aborted = abort;
                if (!busy) {
                    read(abort, (err) => {
                    //incase the source has already ended normally,
                    //we should pass our own error.
                        cb(abort);
                    }); 
                } else {
                    read(abort, (err) => {
                    //if we are still busy, wait for the mapper to complete.
                        if (busy) {
                            abortCb = cb; 
                        } else {
                            cb(abort); 
                        }
                    }); 
                }
            } else {
                read(null, (end, data) => {
                    if (end) {
                        cb(end); 
                    } else if (aborted) {
                        cb(aborted); 
                    } else {
                        busy = true;
                        map(data, (err, data) => {
                            busy = false;
                            if (aborted) {
                                cb(aborted);
                                abortCb && abortCb(aborted);
                            } else if (err) {
                                next(err, cb); 
                            } else {
                                cb(null, data); 
                            }
                        });
                    }
                }); 
            }
        };
    };
};







