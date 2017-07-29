const PouchDB = adone.database.pouch.coverage.DB;
const upsert = PouchDB.utils.upsert;
const utils = PouchDB.utils.mapReduceUtils;

describe("db", "pouch", "mapreduce", () => {
    it("should throw an error with no doc id", async () => {
        await assert.throws(async () => upsert());
    });
    it("should throw an error if the doc errors", async () => {
        await assert.throws(async () => upsert({
            get(foo, cb) {
                cb(new Error("a fake error!"));
            }
        }, "foo"));
    });
    it("should fulfill if the diff returns false", async () => {
        await upsert({
            get(foo, cb) {
                cb(null, "lalala");
            }
        }, "foo", () => {
            return false;
        });
    });
    it("should error if it can't put", async () => {
        await assert.throws(async () => upsert({
            get(foo, cb) {
                cb(null, "lalala");
            },
            put() {
                return Promise.reject(new Error("falala"));
            }
        }, "foo", () => {
            return true;
        }));
    });
});

describe("db", "pouch", "mapreduce", () => {
    it("callbackify should work with a callback", (done) => {
        function fromPromise() {
            return Promise.resolve(true);
        }
        utils.callbackify(fromPromise)((err, resp) => {
            assert.isNull(err);
            assert.exists(resp);
            done();
        });
    });

    it("fin should work without returning a function and it resolves", async () => {
        await utils.fin(Promise.resolve(), () => {
            return Promise.resolve();
        });
    });

    it("fin should work without returning a function and it rejects", async () => {
        await assert.throws(async () => utils.fin(Promise.reject(new Error()), () => {
            return Promise.resolve();
        }));
    });
});
