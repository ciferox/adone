const {
    p2p: { stream: { pull, abortable } }
} = adone;

describe("pull", "abortable", () => {
    it("common", (done) => {
        require("../interleavings").test((async) => {
            let isDone = false;
            const abrt = abortable(() => {
                isDone = true;
            });
            const o = [];
        
            pull(
                pull.values([1, 2, 3, 4, 5]),
                async.through("pre"),
                abrt,
                async.through("post"),
                pull.asyncMap((data, cb) => {
                    async(() => {
                        if (data == 3) {
                            abrt.abort(); 
                        }
                        o.push(data);
                        cb(null, data);
                    })();
                }),
                pull.drain(null, (err) => {
                    if (o.length == 3) {
                        assert.deepEqual(o, [1, 2, 3]); 
                    } else {
                        assert.deepEqual(o, [1, 2]); 
                    }
        
                    assert.ok(isDone);
                    async.done();
                    setTimeout(done, 300);
                })
            );
        });
    });    
});

