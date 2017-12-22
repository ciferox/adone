import * as util from "./utils";

const MockDatabase = function (statusCodeToReturn, dataToReturn) {
    this.once = this.removeListener = function () { };
    this.type = function () {
        return "mock";
    };
    this.id = function (callback) {
        if (callback) {
            callback(123);
        } else {
            return Promise.resolve(123);
        }
    };
    this.get = function () {
        return new Promise((fulfill, reject) => {
            setTimeout(() => {
                if (statusCodeToReturn !== 200) {
                    reject({ status: statusCodeToReturn });
                } else {
                    fulfill(dataToReturn);
                }
            }, 0);
        });
    };
    this.changes = function (opts) {
        if (opts.complete) {
            opts.complete(null, { results: [] });
        }
        const promise = Promise.resolve({ results: [] });
        promise.on = function () {
            return this;
        };
        return promise;
    };
    this.put = function () {
        return Promise.resolve();
    };
};

const getCallback = (expectError, done) => {
    // returns a function which expects to be called within a certain time.
    // Fails the test otherwise
    const maximumTimeToWait = 500;
    let hasBeenCalled = false;
    let err;
    const callback = (error) => {
        hasBeenCalled = true;
        err = error;
    };
    const timeOutCallback = () => {
        assert.equal(hasBeenCalled, true, "callback has been called");
        if (!expectError) {
            assert.null(err, "error expectation fulfilled");
        }
        done();
    };
    setTimeout(timeOutCallback, maximumTimeToWait);
    return callback;
};

describe("database", "pouch", "replication-http-errors", () => {
    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    it("Initial replication is ok if source returns HTTP 404", (done) => {
        const source = new MockDatabase(404, null);
        const target = new MockDatabase(200, {});
        DB.replicate(source, target, {}, getCallback(false, done));
    });
    it("Initial replication is ok if target returns HTTP 404", (done) => {
        const source = new MockDatabase(200, {});
        const target = new MockDatabase(404, null);
        DB.replicate(source, target, {}, getCallback(false, done));
    });
    it("Initial replication is ok if source and target return HTTP 200",
        (done) => {
            const source = new MockDatabase(200, {});
            const target = new MockDatabase(200, {});
            DB.replicate(source, target, {}, getCallback(false, done));
        });
    it("Initial replication returns err if source returns HTTP 500",
        (done) => {
            const source = new MockDatabase(500, null);
            const target = new MockDatabase(200, {});
            DB.replicate(source, target, { retry: false }, getCallback(true, done));
        });
    it("Initial replication returns err if target returns HTTP 500",
        (done) => {
            const source = new MockDatabase(200, {});
            const target = new MockDatabase(500, null);
            DB.replicate(source, target, { retry: false }, getCallback(true, done));
        });
    it("Initial replication returns err if target and source return HTTP 500",
        (done) => {
            const source = new MockDatabase(500, null);
            const target = new MockDatabase(500, null);
            DB.replicate(source, target, { retry: false }, getCallback(true, done));
        });
    it("Subsequent replication returns err if source return HTTP 500",
        (done) => {
            const source = new MockDatabase(500, null);
            const target = new MockDatabase(200, { last_seq: 456 });
            DB.replicate(source, target, { retry: false }, getCallback(true, done));
        });
});
