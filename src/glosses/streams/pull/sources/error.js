//a stream that errors immediately.
export default function error(err) {
    return function (abort, cb) {
        cb(err);
    };
}
