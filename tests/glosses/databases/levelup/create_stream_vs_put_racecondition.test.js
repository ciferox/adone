const { levelup } = adone.database;
const common = require("./common");
const assert = require("referee").assert;

function makeTest(db, delay, done) {
    // this should be an empty stream
    let i = 0;
    let j = 0;
    let k = 0;
    let m = 0;
    let streamEnd = false;
    let putEnd = false;

    db.createReadStream().on("data", (data) => {
        i++;
    }).on("end", () => {
        //since the readStream is created before inserting anything
        //it should be empty? right?
        assert.equals(i, 0, "stream read the future");

        if (putEnd) {
            done();
        }
        streamEnd = true;
    });

    db.on("put", (key, value) => {
        j++;
    });

    //insert 10 things, 
    //then check the right number of events where emitted.
    function insert() {
        m++;
        db.put(`hello${k++ / 10}`, k, next);
    }

    delay(() => {
        insert(); insert(); insert(); insert(); insert();
        insert(); insert(); insert(); insert(); insert();
    });

    function next() {
        if (--m) {
            return;
        }
        process.nextTick(() => {
            assert.equals(j, 10);
            assert.equals(i, 0);

            if (streamEnd) {
                done();
            }
            putEnd = true;
        });
    }
}

describe.skip("ReadStream", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.readStreamSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    //TODO: test various encodings
    it("readStream and then put in nextTick", (done) => {
        ctx.openTestDatabase((db) => {
            makeTest(db, process.nextTick, done);
        });
    });

    it("readStream and then put in nextTick, defered open", (done) => {
        const location = common.nextLocation();
        const db = levelup(location);

        ctx.closeableDatabases.push(db);
        ctx.cleanupDirs.push(location);

        makeTest(db, process.nextTick, done);
    });

    it("readStream and then put, defered open", (done) => {
        const location = common.nextLocation();
        const db = levelup(location);

        ctx.closeableDatabases.push(db);
        ctx.cleanupDirs.push(location);

        makeTest(db, (f) => {
            f();
        }, done);
    });

    it("readStream and then put", (done) => {
        ctx.openTestDatabase((db) => {
            makeTest(db, (f) => {
                f();
            }, done);
        });
    });
});
