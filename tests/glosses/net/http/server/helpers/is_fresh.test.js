describe("net", "http", "helpers", "isFresh", () => {
    const { isFresh } = adone.net.http.server.helper;


    describe("when a non-conditional GET is performed", () => {
        it("should be stale", () => {
            const reqHeaders = {};
            const resHeaders = {};
            assert.ok(!isFresh(reqHeaders, resHeaders));
        });
    });

    describe("when requested with If-None-Match", () => {
        describe("when ETags match", () => {
            it("should be fresh", () => {
                const reqHeaders = { "if-none-match": '"foo"' };
                const resHeaders = { etag: '"foo"' };
                assert.ok(isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when ETags mismatch", () => {
            it("should be stale", () => {
                const reqHeaders = { "if-none-match": '"foo"' };
                const resHeaders = { etag: '"bar"' };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when at least one matches", () => {
            it("should be fresh", () => {
                const reqHeaders = { "if-none-match": ' "bar" , "foo"' };
                const resHeaders = { etag: '"foo"' };
                assert.ok(isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when etag is missing", () => {
            it("should be stale", () => {
                const reqHeaders = { "if-none-match": '"foo"' };
                const resHeaders = {};
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when ETag is weak", () => {
            it("should be fresh on exact match", () => {
                const reqHeaders = { "if-none-match": 'W/"foo"' };
                const resHeaders = { etag: 'W/"foo"' };
                assert.ok(isFresh(reqHeaders, resHeaders));
            });

            it("should be fresh on strong match", () => {
                const reqHeaders = { "if-none-match": 'W/"foo"' };
                const resHeaders = { etag: '"foo"' };
                assert.ok(isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when ETag is strong", () => {
            it("should be fresh on exact match", () => {
                const reqHeaders = { "if-none-match": '"foo"' };
                const resHeaders = { etag: '"foo"' };
                assert.ok(isFresh(reqHeaders, resHeaders));
            });

            it("should be fresh on weak match", () => {
                const reqHeaders = { "if-none-match": '"foo"' };
                const resHeaders = { etag: 'W/"foo"' };
                assert.ok(isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when * is given", () => {
            it("should be fresh", () => {
                const reqHeaders = { "if-none-match": "*" };
                const resHeaders = { etag: '"foo"' };
                assert.ok(isFresh(reqHeaders, resHeaders));
            });

            it("should get ignored if not only value", () => {
                const reqHeaders = { "if-none-match": '*, "bar"' };
                const resHeaders = { etag: '"foo"' };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });
    });

    describe("when requested with If-Modified-Since", () => {
        describe("when modified since the date", () => {
            it("should be stale", () => {
                const reqHeaders = { "if-modified-since": "Sat, 01 Jan 2000 00:00:00 GMT" };
                const resHeaders = { "last-modified": "Sat, 01 Jan 2000 01:00:00 GMT" };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when unmodified since the date", () => {
            it("should be fresh", () => {
                const reqHeaders = { "if-modified-since": "Sat, 01 Jan 2000 01:00:00 GMT" };
                const resHeaders = { "last-modified": "Sat, 01 Jan 2000 00:00:00 GMT" };
                assert.ok(isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when Last-Modified is missing", () => {
            it("should be stale", () => {
                const reqHeaders = { "if-modified-since": "Sat, 01 Jan 2000 00:00:00 GMT" };
                const resHeaders = {};
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });

        describe("with invalid If-Modified-Since date", () => {
            it("should be stale", () => {
                const reqHeaders = { "if-modified-since": "foo" };
                const resHeaders = { "last-modified": "Sat, 01 Jan 2000 00:00:00 GMT" };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });

        describe("with invalid Modified-Since date", () => {
            it("should be stale", () => {
                const reqHeaders = { "if-modified-since": "Sat, 01 Jan 2000 00:00:00 GMT" };
                const resHeaders = { "last-since": "foo" };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });
    });

    describe("when requested with If-Modified-Since and If-None-Match", () => {
        describe("when both match", () => {
            it("should be fresh", () => {
                const reqHeaders = { "if-none-match": '"foo"', "if-modified-since": "Sat, 01 Jan 2000 01:00:00 GMT" };
                const resHeaders = { etag: '"foo"', "last-modified": "Sat, 01 Jan 2000 00:00:00 GMT" };
                assert.ok(isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when only ETag matches", () => {
            it("should be stale", () => {
                const reqHeaders = { "if-none-match": '"foo"', "if-modified-since": "Sat, 01 Jan 2000 00:00:00 GMT" };
                const resHeaders = { etag: '"foo"', "last-modified": "Sat, 01 Jan 2000 01:00:00 GMT" };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when only Last-Modified matches", () => {
            it("should be stale", () => {
                const reqHeaders = { "if-none-match": '"foo"', "if-modified-since": "Sat, 01 Jan 2000 01:00:00 GMT" };
                const resHeaders = { etag: '"bar"', "last-modified": "Sat, 01 Jan 2000 00:00:00 GMT" };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when none match", () => {
            it("should be stale", () => {
                const reqHeaders = { "if-none-match": '"foo"', "if-modified-since": "Sat, 01 Jan 2000 00:00:00 GMT" };
                const resHeaders = { etag: '"bar"', "last-modified": "Sat, 01 Jan 2000 01:00:00 GMT" };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });
    });

    describe("when requested with Cache-Control: no-cache", () => {
        it("should be stale", () => {
            const reqHeaders = { "cache-control": " no-cache" };
            const resHeaders = {};
            assert.ok(!isFresh(reqHeaders, resHeaders));
        });

        describe("when ETags match", () => {
            it("should be stale", () => {
                const reqHeaders = { "cache-control": " no-cache", "if-none-match": '"foo"' };
                const resHeaders = { etag: '"foo"' };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });

        describe("when unmodified since the date", () => {
            it("should be stale", () => {
                const reqHeaders = { "cache-control": " no-cache", "if-modified-since": "Sat, 01 Jan 2000 01:00:00 GMT" };
                const resHeaders = { "last-modified": "Sat, 01 Jan 2000 00:00:00 GMT" };
                assert.ok(!isFresh(reqHeaders, resHeaders));
            });
        });
    });
});
