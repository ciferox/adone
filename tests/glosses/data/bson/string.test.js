const {
    data: { bson }
} = adone;

describe("string tests", () => {
    it("can serialize and deserialize 0xFFFD", () => {
        const unicodeString = String.fromCharCode(0x41, 0x42, 0xfffd, 0x43, 0x44); // "AB�CD"

        const serialized = bson.encode({ value: unicodeString });
        bson.decode(serialized);
    });
});
