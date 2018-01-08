const {
    is
} = adone;

export default function zip(...streams) {
    if (is.array(streams[0])) {
        streams = streams[0];
    }
    let queue = [];
    const ended = [];

    return function (end, cb) {
        let n = streams.length;
        queue = [];

        const next = () => {
            if (--n) {
                return;
            }
            let l = streams.length;
            let end = 0;
            while (l--) {
                if (ended[l]) {
                    end ++;

                }
            }

            if (end === streams.length) {
                cb(true);
            } else {
                cb(null, queue);
            }
        };

        streams.forEach((stream, i) => {
            if (ended[i]) {
                return next();
            }
            stream(null, (end, data) => {
                if (end) {
                    ended[i] = end, queue[i] = null;
                } else {
                    queue[i] = data;
                }
                next();
            });
        });
    };
}

