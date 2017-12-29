import prop from "../util/prop"; // todo

export default function asyncMap(map) {
    if (!map) {
        return adone.identity;
    }
    map = prop(map);
    let busy = false;
    let abortCb;
    let aborted;
    return function (read) {
        return function next(abort, cb) {
            if (aborted) {
                return cb(aborted);
            }
            if (abort) {
                aborted = abort;
                if (!busy) {
                    read(abort, cb);
                } else {
                    read(abort, () => {
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
                                abortCb(aborted);
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
}


