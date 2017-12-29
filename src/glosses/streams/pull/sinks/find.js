import prop from "../util/prop"; // todo

const {
    stream: { pull }
} = adone;

export default function find(test, cb) {
    let ended = false;
    if (!cb) {
        cb = test, test = adone.identity;
    } else {
        test = prop(test) || adone.identity;

    }

    return pull.drain((data) => {
        if (test(data)) {
            ended = true;
            cb(null, data);
            return false;
        }
    }, (err) => {
        if (ended) {
            return;

        } //already called back
        cb(err === true ? null : err, null);
    });
}
