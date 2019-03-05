const {
    p2p: { stream: { pull, pullStreamToAsyncIterator } }
} = adone;

describe("pull", "pullStreamToAsyncIterator", () => {
    it("should convert sync to async iterator", async () => {
        const sourceValues = [1, 2, 3, 4, 5];
        const source = pull.values(sourceValues);
        const it = pullStreamToAsyncIterator(source);
    
        const values = [];
        for await (const value of it) {
            values.push(value);
        }
    
        assert.deepEqual(values, sourceValues);
    });
    
    it("should convert async to async iterator", async () => {
        const sourceValues = [1, 2, 3, 4, 5];
        const source = pull(
            pull.values(sourceValues),
            pull.asyncMap((value, cb) => {
                setTimeout(() => cb(null, value), value);
            })
        );
        const it = pullStreamToAsyncIterator(source);
    
        const values = [];
        for await (const value of it) {
            values.push(value);
        }
    
        assert.deepEqual(values, sourceValues);
    });
    
    it("should handle error in stream", async () => {
        const sourceValues = [1, 2, new Error("BOOM")];
        const source = pull(
            pull.values(sourceValues),
            pull.asyncMap((value, cb) => {
                setTimeout(() => {
                    if (value instanceof Error) {
                        return cb(value); 
                    }
                    cb(null, value);
                }, value);
            })
        );
        const it = pullStreamToAsyncIterator(source);
    
        const values = [];
    
        try {
            for await (const value of it) {
                values.push(value);
            }
            assert.fail("expected to error");
        } catch (err) {
            //
        }
    
        assert.deepEqual(values, sourceValues.slice(0, -1));
    });
    
});