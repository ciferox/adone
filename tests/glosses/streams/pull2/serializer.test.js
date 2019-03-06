const {
    is,
    stream: { pull2: pull }
} = adone;
const { serializer } = pull;

describe("stream", "pull", "serializer", () => {
    it("JSON", (done) => {
        const theDuplex = serializer({
            source: pull.values([5, "foo", [1, 2, 3], { hello: "world" }]),
            sink: pull.collect((err, values) => {
                // console.log(values);
                if (err) {
                    throw err;
                }
                assert.equal(values[0], 5);
                assert.equal(values[1], "foo");
                assert.equal(values[2].length, 3);
                assert.equal(values[3].hello, "world");
                done();
            })
        });

        pull(
            theDuplex,
            pull.map((str) => {
                // console.log(typeof str, str);
                assert(is.string(str));
                return str;
            }),
            theDuplex
        );
    });

    it("chunky", (done) => {

        const theDuplex = serializer({
            source: pull.values([55, "foo", [1, 2, 3], { hello: "world" }]),
            sink: pull.collect((err, values) => {
                // console.log(values);
                if (err) {
                    throw err;

                }
                assert.equal(values[0], 55);
                assert.equal(values[1], "foo");
                assert.equal(values[2].length, 3);
                assert.equal(values[3].hello, "world");
                done();
            })
        });

        let last = "";

        pull(
            theDuplex,
            pull.through2(function (data) {
                if (data.charAt(0) === "{") { // the last object?
                    return this.queue(last + data);
                } // go ahead and finish

                // emit half, and save the rest for next time
                const i = Math.floor(data.length / 2);
                this.queue(last + data.slice(0, i));
                last = data.slice(i);
            }),
            theDuplex
        );
    });

    it("parse errors", (done) => {
        const theDuplex = serializer({
            source: pull.values(["test"]),
            sink: pull.collect((err, values) => {
                // console.log(err, values);
                assert.equal(Boolean(err), true);
                assert.equal(values.length, 0);
                done();
            })
        });

        pull(
            theDuplex,
            pull.through2(function (read) {
                // screw up the data
                this.queue('"bad json');
            }),
            theDuplex
        );
    });

    it("error suppression", (done) => {
        const theDuplex = serializer({
            source: pull.values(["fail", "success"]),
            sink: pull.collect((err, values) => {
                // console.log(values);
                if (err) {
                    throw err;

                }
                assert.equal(values[0], "success");
                done();
            })
        }, undefined, { ignoreErrors: true });

        pull(
            theDuplex,
            pull.through2(function (data) {
                if (data === '"fail"\n') {
                    return this.queue('"bad json\n');
                }
                this.queue(data);
            }),
            theDuplex
        );
    });
});
