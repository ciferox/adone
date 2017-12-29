import tester from "../util/tester"; //todo

export default function filter(test) {
    //regexp
    test = tester(test);
    return function (read) {
        return function next(end, cb) {
            let sync;
            let loop = true;
            const fn = (end, data) => {
                if (!end && !test(data)) {
                    return sync ? loop = true : next(end, cb);

                }
                cb(end, data);
            };
            while (loop) {
                loop = false;
                sync = true;
                read(end, fn);
                sync = false;
            }
        };
    };
}

