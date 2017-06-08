describe("net", "http", "helpers", "assert", () => {
    const { net: { http: { server: { helper: { assert } } } } } = adone;

    describe("assert()", () => {

        it("should throw when guard is falsy", () => {
            let err;

            try {
                assert(false, 401, "fail");
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 401);
            $.assert(err.message === "fail");
            $.assert(err.expose);
        });

        it("should not throw when guard is truthy", () => {
            assert(true, 401, "fail");
        });

        it("should accept options for the error object", () => {
            let err;

            try {
                assert(false, 401, "fail", { expose: false });
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 401);
            $.assert(err.message === "fail");
            $.assert(!err.expose);
        });

        it("should not expose 5xx errors", () => {
            let err;

            try {
                assert(false, 500);
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 500);
            $.assert(err.message === "Internal Server Error");
            $.assert(!err.expose);
        });

        it("should default to status code 500", () => {
            let err;

            try {
                assert(false, "fail");
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 500);
            $.assert(err.message === "fail");
            $.assert(!err.expose);
        });
    });

    describe("assert.equal()", () => {
        it("should throw when things aren't equal", () => {
            let err;
            try {
                assert.equal("a", "b", 401, "fail");
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 401);
            $.assert(err.message === "fail");
        });

        it("should not throw when things are equal", () => {
            assert.equal(1, "1", 401, "fail");
        });
    });

    describe("assert.notEqual()", () => {
        it("should throw when things are equal", () => {
            let err;
            try {
                assert.notEqual("a", "a", 401, "fail");
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 401);
            $.assert(err.message === "fail");
        });

        it("should not throw when things aren't equal", () => {
            assert.notEqual(1, 11, 401, "fail");
        });
    });

    describe("assert.strictEqual()", () => {
        it("should throw when things aren't equal", () => {
            let err;
            try {
                assert.strictEqual(1, "1", 401, "fail");
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 401);
            $.assert(err.message === "fail");
        });

        it("should not throw when things are equal", () => {
            assert.strictEqual(1, 1, 401, "fail");
        });
    });

    describe("assert.notStrictEqual()", () => {
        it("should throw when things are equal", () => {
            let err;
            try {
                assert.notStrictEqual(1, 1, 401, "fail");
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 401);
            $.assert(err.message === "fail");
        });

        it("should not throw when things aren't equal", () => {
            assert.notStrictEqual(1, "1", 401, "fail");
        });
    });

    describe("assert.deepEqual()", () => {
        it("should throw when things aren't deeply equal", () => {
            let err;
            try {
                assert.deepEqual({ a: "a" }, { b: "b" }, 401, "fail");
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 401);
            $.assert(err.message === "fail");
        });

        it("should not throw when things are deeply equal", () => {
            assert.deepEqual({ a: "a" }, { a: "a" }, 401, "fail");
        });
    });

    describe("assert.notDeepEqual()", () => {
        it("should throw when things aren't deeply equal", () => {
            let err;
            try {
                assert.notDeepEqual({ a: "a" }, { a: "a" }, 401, "fail");
            } catch (e) {
                err = e;
            }

            $.assert(err);
            $.assert(err.status === 401);
            $.assert(err.message === "fail");
        });

        it("should not throw when things are deeply equal", () => {
            assert.notDeepEqual({ a: "a" }, { b: "b" }, 401, "fail");
        });
    });
});
