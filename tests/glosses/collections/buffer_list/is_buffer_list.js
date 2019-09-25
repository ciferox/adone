
const {
    collection: { BufferList }
} = adone;
const { BufferListStream } = BufferList;

describe("isBufferList", () => {
    it("isBufferList positives", () => {
        assert.ok(BufferList.isBufferList(new BufferList()));
        assert.ok(BufferList.isBufferList(new BufferListStream()));
    });

    it("isBufferList negatives", () => {
        const types = [
            null,
            undefined,
            NaN,
            true,
            false,
            {},
            [],
            Buffer.alloc(0),
            [Buffer.alloc(0)]
        ];

        for (const obj of types) {
            assert.notOk(BufferList.isBufferList(obj));
        }
    });
});
