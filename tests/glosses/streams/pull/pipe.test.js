const {
    stream: { pull: { pipe } }
} = adone;

const oneTwoThree = () => [1, 2, 3];

const collect = async (source) => {
    const vals = [];
    for await (const val of source) {
        vals.push(val);
    }
    return vals;
};

describe("stream", "pull", "pipe", () => {
    it("should pipe source", async () => {
        const result = await pipe(oneTwoThree);
        assert.deepEqual(result, [1, 2, 3]);
    });

    it("should pipe source -> sink", async () => {
        const result = await pipe(oneTwoThree, collect);
        assert.deepEqual(result, [1, 2, 3]);
    });

    it("should pipe source -> transform -> sink", async () => {
        const result = await pipe(
            oneTwoThree,
            function transform(source) {
                return (async function* () { // A generator is async iterable
                    for await (const val of source) {
                        yield val * 2;
                    }
                })();
            },
            collect
        );

        assert.deepEqual(result, [2, 4, 6]);
    });

    it("should allow iterable first param", async () => {
        const result = await pipe(oneTwoThree(), collect);
        assert.deepEqual(result, [1, 2, 3]);
    });

    it("should allow duplex at start", async () => {
        const duplex = {
            sink: collect,
            source: oneTwoThree()
        };

        const result = await pipe(duplex, collect);
        assert.deepEqual(result, [1, 2, 3]);
    });

    it("should allow duplex at end", async () => {
        const duplex = {
            sink: collect,
            source: oneTwoThree()
        };

        const result = await pipe(oneTwoThree, duplex);
        assert.deepEqual(result, [1, 2, 3]);
    });

    it("should allow duplex in the middle", async () => {
        const duplex = {
            sink: (source) => {
                duplex.source = source;
            },
            source: { [Symbol.asyncIterator]() { } }
        };

        const result = await pipe(oneTwoThree, duplex, collect);
        assert.deepEqual(result, [1, 2, 3]);
    });
});
