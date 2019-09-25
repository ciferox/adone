const {
    stream: { pull }
} = adone;
const { pipe, pair } = pull;

describe("stream", "pull", "pair", () => {
    it("simple", async () => {
        const p = pair();
        const input = [1, 2, 3];
        pipe(input, p.sink);
        const values = await pipe(p.source, collect);
        console.log(values); // [1, 2, 3]
        assert.deepEqual(values, input);
    });

    it("simple - error", async (done) => {
        const p = pair();
        const err = new Error("test errors");
        pipe({
            async *[Symbol.iterator]() {
                throw err;
            }
        }, p.sink);
        try {
            await pipe(p.source, collect);
        } catch (_err) {
            console.log(_err);
            assert.equal(_err, err);
            done();
        }
    });

    it("echo duplex", (done) => {
        const d = pair.duplex();
        pipe(
            [1, 2, 3],
            d[0],
            collect
        ).then((ary) => {
            assert.deepEqual(ary, [1, 2, 3]);
            done();
        });

        // pipe the second duplex stream back to itself.
        pipe(d[1], through(console.log), d[1]);
    });

    function through(fn) {
        return async function* (source) {
            for await (const value of source) {
                fn(value);
                yield value;
            }
        };
    }

    async function collect(source) {
        const values = [];
        for await (const value of source) {
            values.push(value);
        }
        return values;
    }

});
