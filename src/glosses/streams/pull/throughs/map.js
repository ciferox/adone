import prop from "../util/prop"; // todo

export default function map(mapper) {
    if (!mapper) {
        return adone.identity;
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
}
