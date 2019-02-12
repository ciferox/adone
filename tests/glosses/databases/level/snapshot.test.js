const delayed = require("delayed");
const common = require("./common");
const trickle = require("trickle");

describe("Snapshots", () => {
    beforeEach((done) => {
        common.readStreamSetUp(done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("test ReadStream implicit snapshot", (done) => {
        common.openTestDatabase((db) => {
            // 1) Store 100 random numbers stored in the database
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                // 2) Create an iterator on the current data, pipe it through a slow stream
                //    to make *sure* that we're going to be reading it for longer than it
                //    takes to overwrite the data in there.

                let rs = db.createReadStream();
                rs = rs.pipe(trickle({ interval: 5 }));
                rs.on("data", common.dataSpy);
                rs.once("end", common.endSpy);

                rs.once("close", delayed.delayed(common.verify.bind(this, rs, done), 0.05));

                process.nextTick(() => {
                    // 3) Concoct and write new random data over the top of existing items.
                    //    If we're not using a snapshot then then we'd expect the test
                    //    to fail because it'll pick up these new values rather than the
                    //    old ones.
                    const newData = [];
                    let i;
                    let k;

                    for (i = 0; i < 100; i++) {
                        k = (i < 10 ? "0" : "") + i;
                        newData.push({
                            type: "put",
                            key: k,
                            value: Math.random()
                        });
                    }
                    db.batch(newData.slice(), (err) => {
                        assert.notExists(err);
                        // we'll return here faster than it takes the readStream to complete
                    });
                });
            });
        });
    });
});
