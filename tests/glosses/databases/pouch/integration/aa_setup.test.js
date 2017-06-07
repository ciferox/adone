require("./node.setup");

describe("DB Setup", () => {
    it("we can find CouchDB with admin credentials", (done) => {
        testUtils.ajax({ url: `${testUtils.couchHost()}/_session` },
            (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.exists(res.ok, "Found CouchDB");
                assert.include(res.userCtx.roles, "_admin", "Found admin permissions");
                done();
            }
        );
    });

    it("PouchDB has a version", () => {
        assert.isString(PouchDB.version);
        assert.match(PouchDB.version, /\d+\.\d+\.\d+/);
    });

    // if (typeof process !== "undefined" && !process.browser) {
    //     it("PouchDB version matches package.json", () => {
    //         let pkg = require("../../packages/node_modules/pouchdb/package.json");
    //         assert.equal(PouchDB.version, pkg.version);
    //     });
    // }
});
