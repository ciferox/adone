

//a pass through stream that doesn't change the value.
module.exports = function through(op, onEnd) {
    let a = false;

    const once = function (abort) {
        if (a || !onEnd) {
            return;
        }
        a = true;
        onEnd(abort === true ? null : abort);
    };

    return function (read) {
        return function (end, cb) {
            if (end) {
                once(end);
            }
            return read(end, (end, data) => {
                if (!end) {
                    op && op(data);
                } else {
                    once(end);
                }
                cb(end, data);
            });
        };
    };
};
