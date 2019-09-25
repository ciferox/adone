const {
    collection: { BufferList }
} = adone;
const { BufferListStream } = BufferList;

describe("convert", () => {
    it("convert from BufferList to BufferListStream", () => {
        const data = Buffer.from(`TEST-${Date.now()}`);
        const bl = new BufferList(data);
        const bls = new BufferListStream(bl);
        assert.ok(bl.slice().equals(bls.slice()));
    });

    it("convert from BufferListStream to BufferList", () => {
        const data = Buffer.from(`TEST-${Date.now()}`);
        const bls = new BufferListStream(data);
        const bl = new BufferList(bls);
        assert.ok(bl.slice().equals(bls.slice()));
    });
});
