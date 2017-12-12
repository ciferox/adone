import {
    latch,
    schedule
} from "./support";

const {
    is,
    std: {
        assert,
        stream: { PassThrough }
    }
} = adone;

const {
    Mux
} = adone.private(adone.net.amqp);

const stream = () => {
    return new PassThrough({ objectMode: true });
};

const readAllObjects = (s, cb) => {
    const objs = [];

    const read = () => {
        let v = s.read();
        while (!is.null(v)) {
            objs.push(v);
            v = s.read();
        }
    };

    s.on("end", () => {
        cb(objs);
    });
    s.on("readable", read);

    read();
};

describe("net", "amqp", "mux", () => {
    it("single input", (done) => {
        const input = stream();
        const output = stream();
        input.on("end", () => {
            output.end();
        });

        const mux = new Mux(output);
        mux.pipeFrom(input);

        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        // not 0, it's treated specially by PassThrough for some reason. By
        // 'specially' I mean it breaks the stream. See e.g.,
        // https://github.com/isaacs/readable-stream/pull/55
        data.forEach(input.write.bind(input));

        readAllObjects(output, (vals) => {
            assert.deepEqual(data, vals);
            done();
        });

        input.end();
    });

    it("two sequential inputs", (done) => {
        const input1 = stream();
        const input2 = stream();
        const output = stream();
        const mux = new Mux(output);
        mux.pipeFrom(input1);
        mux.pipeFrom(input2);

        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        data.forEach((v) => {
            input1.write(v);
        });

        input1.on("end", () => {
            data.forEach((v) => {
                input2.write(v);
            });
            input2.end();
        });
        input2.on("end", () => {
            output.end();
        });

        input1.end();
        readAllObjects(output, (vs) => {
            assert.equal(2 * data.length, vs.length);
            done();
        });
    });

    it("two interleaved inputs", (done) => {
        const input1 = stream();
        const input2 = stream();
        const output = stream();
        const mux = new Mux(output);
        mux.pipeFrom(input1);
        mux.pipeFrom(input2);

        const endLatch = latch(2, () => {
            output.end();
        });
        input1.on("end", endLatch);
        input2.on("end", endLatch);

        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        data.forEach((v) => {
            input1.write(v);
        });
        input1.end();

        data.forEach((v) => {
            input2.write(v);
        });
        input2.end();

        readAllObjects(output, (vs) => {
            assert.equal(2 * data.length, vs.length);
            done();
        });
    });

    it("unpipe", (done) => {
        const input = stream();
        const output = stream();
        const mux = new Mux(output);

        const pipedData = [1, 2, 3, 4, 5];
        const unpipedData = [6, 7, 8, 9];

        mux.pipeFrom(input);

        schedule(() => {
            pipedData.forEach(input.write.bind(input));
            mux.unpipeFrom(input);

            schedule(() => {
                unpipedData.forEach(input.write.bind(input));
                input.end();
                schedule(() => {
                    // exhaust so that 'end' fires
                    let v; while (v = input.read()) {}
                });
            });
        });

        input.on("end", () => {
            output.end();
        });

        readAllObjects(output, (vals) => {
            try {
                assert.deepEqual(pipedData, vals);
                done();
            } catch (e) {
                done(e);
            }
        });
    });

    it("roundrobin", (done) => {
        const input1 = stream();
        const input2 = stream();
        const output = stream();
        const mux = new Mux(output);

        mux.pipeFrom(input1);
        mux.pipeFrom(input2);

        const endLatch = latch(2, () => {
            output.end();
        });
        input1.on("end", endLatch);
        input2.on("end", endLatch);

        const ones = [1, 1, 1, 1, 1];
        ones.forEach((v) => {
            input1.write(v);
        });
        input1.end();

        const twos = [2, 2, 2, 2, 2];
        twos.forEach((v) => {
            input2.write(v);
        });
        input2.end();

        readAllObjects(output, (vs) => {
            assert.deepEqual([1, 2, 1, 2, 1, 2, 1, 2, 1, 2], vs);
            done();
        });

    });
});