const {
    is,
    data: { baseX }
} = adone;

describe("data", "baseX", () => {
    const fixtures = require("./fixtures.json");

    const bases = Object.keys(fixtures.alphabets).reduce((bases, alphabetName) => {
        bases[alphabetName] = baseX(fixtures.alphabets[alphabetName]);
        return bases;
    }, {});

    fixtures.valid.forEach((f) => {
        it(`can encode ${f.alphabet}: ${f.hex}`, () => {
            const base = bases[f.alphabet];
            const actual = base.encode(Buffer.from(f.hex, "hex"));

            assert.equal(actual, f.string);
        });
    });

    fixtures.valid.forEach((f) => {
        it(`can decode ${f.alphabet}: ${f.string}`, () => {
            const base = bases[f.alphabet];
            const actual = base.decode(f.string).toString("hex");

            assert.equal(actual, f.hex);
        });
    });

    fixtures.invalid.forEach((f) => {
        it(`decode throws on ${f.description}`, () => {
            let base = bases[f.alphabet];

            assert.throws(() => {
                if (!base) {
                    base = baseX(f.alphabet);
                }

                base.decode(f.string);
            }, new RegExp(f.exception));
        });
    });

    it("decode should return Buffer", () => {
        assert.ok(is.buffer(bases.base2.decode("")));
        assert.ok(is.buffer(bases.base2.decode("01")));
    });

    it("encode throws on string", () => {
        const base = bases.base58;

        assert.throws(() => {
            base.encode("a");
        }, new RegExp("^Expected Buffer$"));
    });
});
