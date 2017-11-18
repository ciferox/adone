const start = require("./common");
const mongoose = adone.odm;

describe("connection:", () => {
    describe("supports authSource", () => {
        it("in querystring", (done) => {
            const conn = mongoose.createConnection();
            conn._open = function () {
                assert.ok(conn.options);
                assert.ok(conn.options.auth);
                assert.equal(conn.options.auth.authSource, "users");
                conn.close(done);
            };
            conn.open(`${start.uri}?authSource=users`);
        });

        it("passed as an option", (done) => {
            const conn = mongoose.createConnection();
            conn._open = function () {
                assert.ok(conn.options);
                assert.ok(conn.options.auth);
                assert.equal(conn.options.auth.authSource, "users");
                conn.close(done);
            };
            conn.open(start.uri, { auth: { authSource: "users" } });
        });
    });
});
