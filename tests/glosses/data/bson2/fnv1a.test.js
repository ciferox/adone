const {
    is
} = adone;

const {
    fnv1a
} = adone.private(adone.data.bson2);
const { fnv1a24 } = fnv1a;

describe("data", "bson", "fnv1a()", () => {
    require("./specs/object-id/vectors.json").vectors.forEach((testCase) => {
        const hash = testCase.hash;

        let vector;
        let encoding;
        if (is.string(testCase.vector)) {
            vector = testCase.vector;
            encoding = "utf8";
        } else if (is.string(testCase.vectorHex)) {
            vector = testCase.vectorHex;
            encoding = "hex";
        }

        it(`should properly hash the string "${vector}" with a 24 bit FNV-1a`, () => {
            const hashed = fnv1a24(vector, encoding);
            const buff = Buffer.from([(hashed >>> 16) & 0xff, (hashed >>> 8) & 0xff, hashed & 0xff]);
            expect(buff.toString("hex")).to.equal(hash);
        });
    });
});