const PouchDB = adone.database.pouch.coverage.DB;
const parseUri = PouchDB.utils.parseUri;

describe("test.parse-uri.js", () => {

    it("parses a basic uri", () => {
        const parsed = parseUri("http://foobar.com");
        assert.equal(parsed.host, "foobar.com");
        assert.equal(parsed.protocol, "http");
    });

    it("parses a complex uri", () => {
        const parsed = parseUri("http://user:pass@foo.com/baz/bar/index.html?hey=yo");
        assert.deepEqual(parsed, {
            anchor: "",
            query: "hey=yo",
            file: "index.html",
            directory: "/baz/bar/",
            path: "/baz/bar/index.html",
            relative: "/baz/bar/index.html?hey=yo",
            port: "",
            host: "foo.com",
            password: "pass",
            user: "user",
            userInfo: "user:pass",
            authority: "user:pass@foo.com",
            protocol: "http",
            source: "http://user:pass@foo.com/baz/bar/index.html?hey=yo",
            queryKey: { hey: "yo" }
        }
        );
    });

    it("#2853 test uri parsing usernames/passwords", () => {
        const uri = parseUri("http://u%24ern%40me:p%26%24%24w%40rd@foo.com");
        assert.equal(uri.password, "p&$$w@rd");
        assert.equal(uri.user, "u$ern@me");
        assert.equal(uri.host, "foo.com");
    });
});
