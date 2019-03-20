const {
    stream: { pull }
} = adone;
const { ndjson, pair, pullStreamToStream } = pull;

describe("stream", "pull", "ndjson", () => {
    it("serialize and parses one valid json object", (done) => {
        pull(
            pull.values([
                { a: 1 }
            ]),
            ndjson.serialize(),
            ndjson.parse(),
            pull.drain((data) => {
                expect(data).to.eql({ a: 1 });
            }, done)
        );
    });
    it("serializes and parses several valid json object", (done) => {
        const values = [
            { a: 1 },
            { b: 2 },
            { c: 3 },
            { d: 4 },
            { e: 5 },
            { b: 6 }
        ];

        pull(
            pull.values(values),
            ndjson.serialize(),
            ndjson.parse(),
            pull.collect((err, data) => {
                expect(err).to.not.exist;
                expect(data).to.eql(values);
                done();
            })
        );
    });

    it("fails to parse invalid data", (done) => {
        pull(
            pull.values([
                Buffer.from("hey")
            ]),
            ndjson.parse(),
            pull.collect((err, data) => {
                expect(err).to.exist;
                expect(data).to.be.empty;
                done();
            })
        );
    });

    describe("interop", () => {
        const ndjsonStream = require("ndjson");

        describe("interop", () => {
            it("ndjsonStream serialize -> ndjsonPull parse", (done) => {
                const values = [
                    { a: 1 },
                    { b: 2 },
                    { c: 3 },
                    { d: 4 },
                    { e: 5 },
                    { b: 6 }
                ];

                const p = pair();

                const writable = pullStreamToStream.sink(p.sink);
                const serialize = ndjsonStream.serialize();
                serialize.pipe(writable);
                values.forEach((v) => {
                    serialize.write(v);
                });
                serialize.end();

                pull(
                    p.source,
                    ndjson.parse(),
                    pull.collect((err, data) => {
                        expect(err).to.not.exist;
                        expect(data).to.eql(values);
                        done();
                    })
                );
            });

            it("ndjsonPull serialize -> ndjsonStream parse", (done) => {
                const values = [
                    { a: 1 },
                    { b: 2 },
                    { c: 3 },
                    { d: 4 },
                    { e: 5 },
                    { b: 6 }
                ];

                const p = pair();

                pull(
                    pull.values(values),
                    ndjson.serialize(),
                    p.sink
                );

                const readable = pullStreamToStream.source(p.source);
                const chunks = [];
                readable
                    .pipe(ndjsonStream.parse())
                    .on("data", (chunk) => {
                        chunks.push(chunk);
                    })
                    .on("end", () => {
                        expect(chunks).to.eql(values);
                        done();
                    });
            });
        });
    });
});
