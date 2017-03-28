const delayed = require("delayed");
const common = require("./common");
const SlowStream = require("slow-stream");
const refute = require("referee").refute;

describe("Snapshots", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.readStreamSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("test ReadStream implicit snapshot", function (done) {
        ctx.openTestDatabase((db) => {

            // 1) Store 100 random numbers stored in the database
            db.batch(ctx.sourceData.slice(), function (err) {
                refute(err);

                // 2) Create an iterator on the current data, pipe it through a SlowStream
                //    to make *sure* that we're going to be reading it for longer than it
                //    takes to overwrite the data in there.

                let rs = db.readStream();
                rs = rs.pipe(new SlowStream({ maxWriteInterval: 5 }));
                rs.on("data", ctx.dataSpy);
                rs.once("end", ctx.endSpy);

                rs.once("close", delayed.delayed(ctx.verify.bind(null, rs, done), 0.05));

                process.nextTick(() => {
                    // 3) Concoct and write new random data over the top of existing items.
                    //    If we're not using a snapshot then then we'd expect the test
                    //    to fail because it'll pick up these new values rather than the
                    //    old ones.
                    let newData = []
                        , i
                        , k;

                    for (i = 0; i < 100; i++) {
                        k = (i < 10 ? "0" : "") + i;
                        newData.push({
                            type: "put"
                            , key: k
                            , value: Math.random()
                        });
                    }
                    // using sync:true here to ensure it's written fully to disk
                    db.batch(newData.slice(), { sync: true }, (err) => {
                        refute(err);
                        // we'll return here faster than it takes the readStream to complete
                    });
                });
            });
        });
    });
});
