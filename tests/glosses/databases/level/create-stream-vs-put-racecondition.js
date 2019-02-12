// NOTE: this file is outdated. It is not included in the test suite (index.js).

const levelup = require("../lib/levelup.js");
const memdown = require("memdown");
const common = require("./common");
const assert = require("referee").assert;
const buster = require("bustermove");

function makeTest(db, delay, done) {
    // this should be an empty stream
    let i = 0;
    let j = 0;
    let k = 0;
    let m = 0;
    let streamEnd = false;
    let putEnd = false;

    db.createReadStream()
        .on("data", (data) => {
            i++;
        })
        .on("end", () => {
            // since the readStream is created before inserting anything
            // it should be empty? right?
            assert.equals(i, 0, "stream read the future");

            if (putEnd) {
                done();
            }
            streamEnd = true;
        });

    db.on("put", (key, value) => {
        j++;
    });

    // insert 10 things,
    // then check the right number of events where emitted.
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

buster.testCase("ReadStream", {
    setUp: common.readStreamSetUp,

    tearDown: common.commonTearDown,

    // TODO: test various encodings
    "readStream and then put in nextTick"(done) {
        this.openTestDatabase((db) => {
            makeTest(db, process.nextTick, done);
        });
    },
    "readStream and then put in nextTick, defered open"(done) {
        const db = levelup(memdown());

        this.closeableDatabases.push(db);

        makeTest(db, process.nextTick, done);
    },
    "readStream and then put, defered open"(done) {
        const db = levelup(memdown());

        this.closeableDatabases.push(db);

        makeTest(db, (f) => {
            f(); 
        }, done);
    },
    "readStream and then put"(done) {
        this.openTestDatabase((db) => {
            makeTest(db, (f) => {
                f(); 
            }, done);
        });
    }
});
