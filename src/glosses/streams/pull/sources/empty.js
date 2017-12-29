//a stream that ends immediately.
export default function empty() {
    return function (abort, cb) {
        cb(true);
    };
}
