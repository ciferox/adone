const {
    stream: { pull },
    std: { crypto }
} = adone;
const { handshake, hang: Hang } = pull;

const R = Buffer.from(crypto.randomBytes(16).toString("hex"), "ascii");

const agreement = function (timeout, cb) {
    if (!cb) {
        cb = timeout, timeout = null;
    }

    const stream = handshake({ timeout: timeout || 100 }, cb);
    const shake = stream.handshake;
    shake.write(R);
    shake.read(32, (err, data) => {
        if (err) {
            cb(err);
        } else {
            assert.deepEqual(data, R);
            cb(null, shake.rest());
        }
    });

    return stream;
};

describe("stream", "pull", "handshake", () => {
    it("simple", (done) => {

        const hello = Buffer.from("hello there did it work?", "ascii");

        const client = agreement((err, stream) => {
            pull(
                pull.values([hello, hello, hello]),
                stream,
                pull.collect((err, data) => {
                    assert.deepEqual(
                        Buffer.concat(data),
                        Buffer.concat([hello, hello, hello])
                    );
                    // console.log("done");
                    done();
                })
            );
        });

        const server = agreement((err, stream) => {
            pull(stream, stream); //ECHO
        });

        const logger = function (name) {
            return pull.through((data) => {
                // console.log(name, data.toString("utf8"));
            });
        };

        pull(client, logger("A->B"), server, logger("A<-B"), client);

    });


    const abort = function (cb) {
        const stream = handshake({ timeout: 100 }, cb);
        const shake = stream.handshake;
        shake.read(16, (err, data) => {
            shake.abort(new Error("intentional"));
        });

        return stream;
    };


    it("abort", (done) => {

        const client = agreement((err, stream) => {

        });

        const server = abort((err) => {
            assert.ok(err);
            done();
        });

        pull(client, server, client);

    });

    it("timeout", (done) => {
        let timeout = false;
        const client = agreement(200, (err, stream) => {
            assert.ok(timeout);
            // console.log(err);
            assert.ok(err);
            done();
        });

        setTimeout(() => {
            timeout = true;
        }, 100);

        pull(
            Hang(),
            client
        );

    });

    it("timeout does not apply to the rest of the stream", (done) => {
        const reader = handshake({ timeout: 100 });
        let once = false;
        pull(
            (abort, cb) => {
                if (once) {
                    setTimeout(() => {
                        once = true;
                        cb(null, Buffer.from("hello world"));
                    }, 200);
                } else {
                    cb(true);
                }
            },
            reader
        );

        pull(
            reader.handshake.rest(),
            pull.collect((err, ary) => {
                // console.log(err);
                assert.notOk(err);
                assert.deepEqual(ary, []);
                done();
            })
        );
    });
});
