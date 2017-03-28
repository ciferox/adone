const { levelup } = adone.database;
const common = require("./common");

describe("Idempotent open & close", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.readStreamSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it('call open twice, should emit "open" once', (done) => {
        const location = common.nextLocation();
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

            //close needs to be idempotent too.
            db.close();
            process.nextTick(db.close.bind(db));
        };

        ctx.cleanupDirs.push(location);

        db = levelup(location, { createIfMissing: true }, () => {
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
