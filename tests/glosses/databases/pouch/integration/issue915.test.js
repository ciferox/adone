require("./node.setup");

if (!process.env.LEVEL_ADAPTER &&
    !process.env.LEVEL_PREFIX &&
    !process.env.AUTO_COMPACTION &&
    !process.env.ADAPTER) {
    // these tests don't make sense for anything other than default leveldown
    const fs = require("fs");
    const bufferFrom = require("buffer-from");
    describe("test.issue915.js", () => {
        afterEach((done) => {
            fs.unlink("./tmp/_pouch_veryimportantfiles/something", () => {
                fs.rmdir("./tmp/_pouch_veryimportantfiles/", () => {
                    done();
                });
            });
        });
        it("Put a file in the db, then destroy it", (done) => {
            const db = new PouchDB("veryimportantfiles");
            fs.writeFile("./tmp/_pouch_veryimportantfiles/something",
                bufferFrom("lalala"), () => {
                    db.destroy((err) => {
                        if (err) {
                            return done(err);
                        }
                        fs.readFile("./tmp/_pouch_veryimportantfiles/something",
                            { encoding: "utf8" }, (err, resp) => {
                                if (err) {
                                    return done(err);
                                }
                                assert.equal(resp, "lalala", "./tmp/veryimportantfiles/something was not removed");
                                done();
                            });
                    });
                });
        });
    });
}
