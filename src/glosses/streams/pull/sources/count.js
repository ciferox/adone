export default function count(max) {
    let i = 0;
    max = max || Infinity;
    return function (end, cb) {
        if (end) {
            return cb && cb(end);

        }
        if (i > max) {
            return cb(true);

        }
        cb(null, i++);
    };
}
