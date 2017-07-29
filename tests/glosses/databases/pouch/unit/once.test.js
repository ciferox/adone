const PouchDB = adone.database.pouch.coverage.DB;
const once = PouchDB.utils.once;
const toPromise = PouchDB.utils.toPromise;

describe("db", "pouch", "once", () => {
    it("Only call once ... once", () => {
        const myFun = once(() => { });
        myFun();
        assert.throws(myFun);
    });

    it("Once wrapped in a promise", (done) => {
        const callback = function () { };
        const myFun = toPromise((callback) => {
            setTimeout(() => {
                callback();
                assert.throws(callback);
                done();
            });
        });
        myFun(callback);
    });
});
