import abortCb from "../util/abort_cb"; // todo

const {
    is
} = adone;

export default function once(value, onAbort) {
    return function (abort, cb) {
        if (abort) {
            return abortCb(cb, abort, onAbort);

        }
        if (!is.nil(value)) {
            const _value = value; value = null;
            cb(null, _value);
        } else {
            cb(true);

        }
    };
}
