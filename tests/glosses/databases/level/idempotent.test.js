const common = require("./common");

const {
    database: { level: { DB, backend: { Memory } } }
} = adone;

describe("Idempotent open & close", () => {
    before((done) => {
        common.readStreamSetUp(done);
    });

    after((done) => {
        common.commonTearDown(done);
    });

    it('call open twice, should emit "open" once', (done) => {
        let n = 0;
        let m = 0;
        let db;
        const close = function () {
            const closing = spy();
            db.on("closing", closing);
            db.on("closed", () => {
                assert.equal(closing.callCount, 1);
                assert.sameMembers(closing.getCall(0).args, []);
                done();
            });

            // close needs to be idempotent too.
            db.close();
            process.nextTick(db.close.bind(db));
        };

        db = new DB(new Memory(), () => {
            assert.equal(n++, 0, "callback should fire only once");
            if (n && m) {
                close();
            }
        });

        db.on("open", () => {
            assert.equal(m++, 0, "callback should fire only once");
            if (n && m) {
                close();
            }
        });

        db.open();
    });
});
