const {
    is,
    data: { varint }
} = adone;

const poolSize = 10 * 1024;

const createPool = () => Buffer.alloc(poolSize);

export default function encode(opts) {
    opts = Object.assign({
        fixed: false,
        bytes: 4
    }, opts || {});

    // Only needed for varint
    let pool = opts.fixed ? null : createPool();
    let used = 0;

    let ended = false;

    return (read) => (end, cb) => {
        if (end) {
            ended = end;
        }
        if (ended) {
            return cb(ended);
        }

        read(null, (end, data) => {
            if (end) {
                ended = end;
            }
            if (ended) {
                return cb(ended);
            }

            if (!is.buffer(data)) {
                ended = new Error("data must be a buffer");
                return cb(ended);
            }

            let encodedLength;
            if (opts.fixed) {
                encodedLength = Buffer.alloc(opts.bytes);
                encodedLength.writeInt32BE(data.length, 0);
            } else {
                varint.encode(data.length, pool, used);
                used += varint.encode.bytes;
                encodedLength = pool.slice(used - varint.encode.bytes, used);

                if (pool.length - used < 100) {
                    pool = createPool();
                    used = 0;
                }
            }

            cb(null, Buffer.concat([
                encodedLength,
                data
            ]));
        });
    };
}
