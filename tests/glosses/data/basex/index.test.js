const fixtures = require("./fixtures.json");

const {
    is,
    data: { basex }
} = adone;

const bases = Object.keys(fixtures.alphabets).reduce((bases, alphabetName) => {
    bases[alphabetName] = basex(fixtures.alphabets[alphabetName]);
    return bases;
}, {});

describe("data", "basex/base58", () => {
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
                    base = basex(f.alphabet);
                }

                base.decode(f.string);
            }, new RegExp(f.error));
        });
    });

    it("decode should return Buffer", () => {
        assert.isTrue(is.buffer(bases.base2.decode("")));
        assert.isTrue(is.buffer(bases.base2.decode("01")));
    });
});
