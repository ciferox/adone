require("./node.setup");

const fs = require("fs");
const bufferFrom = require("buffer-from");

describe("db", "pouch", "issue915", () => {
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
                    fs.readFile("./tmp/_pouch_veryimportantfiles/something", { encoding: "utf8" }, (err, resp) => {
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
