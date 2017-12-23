export default function hang(onAbort) {
    let _cb;
    return function (abort, cb) {
        if (abort) {
            if (_cb) {
                _cb(abort);

            }
            cb(abort);
            if (onAbort) {
                onAbort(true);

            }
        } else {
            _cb = cb;

        }

    };
}
