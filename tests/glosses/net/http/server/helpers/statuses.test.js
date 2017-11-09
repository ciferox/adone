describe("net", "http", "helpers", "status", () => {
    const { net: { http: { server: { helper: { status } } } }, std } = adone;

    describe("getMessageByCode", () => {
        it("should be truthy when a valid status code", () => {
            assert.ok(status.getMessageByCode(200));
            assert.ok(status.getMessageByCode(404));
            assert.ok(status.getMessageByCode(500));
        });

        it("should throw for invalid status code", () => {
            assert.throws(status.getMessageByCode.bind(null, 0), /invalid status code/);
            assert.throws(status.getMessageByCode.bind(null, 1000), /invalid status code/);
        });

        it("should throw for unknown status code", () => {
            assert.throws(status.getMessageByCode.bind(null, 299), /invalid status code/);
            assert.throws(status.getMessageByCode.bind(null, 310), /invalid status code/);
        });
    });

    describe("getCodeByMessage", () => {
        it("should be truthy when a valid status message", () => {
            assert.ok(status.getCodeByMessage("OK"));
            assert.ok(status.getCodeByMessage("Not Found"));
            assert.ok(status.getCodeByMessage("Internal Server Error"));
        });

        it("should be case insensitive", () => {
            assert.ok(status.getCodeByMessage("Ok"));
            assert.ok(status.getCodeByMessage("not found"));
            assert.ok(status.getCodeByMessage("INTERNAL SERVER ERROR"));
        });

        it("should throw for unknown status message", () => {
            assert.throws(status.getCodeByMessage.bind(null, "too many bugs"), /invalid status message/);
        });
    });

    describe(".STATUS_CODES", () => {
        it("should be a map of code to message", () => {
            assert.equal(status.STATUS_CODES[200], "OK");
        });

        it("should include codes from Node.js", () => {
            Object.keys(std.http.STATUS_CODES).forEach(function forEachCode(code) {
                assert.ok(status.STATUS_CODES[code], `contains ${code}`);
            });
        });
    });

    describe(".codes", () => {
        it("should include codes from Node.js", () => {
            Object.keys(std.http.STATUS_CODES).forEach(function forEachCode(code) {
                assert.ok(status.codes.has(Number(code)), code);
            });
        });
    });

    describe("isEmptyBody", () => {
        it("should include 204", () => {
            assert(status.isEmptyBody(204));
        });
    });

    describe("isRedirect", () => {
        it("should include 302", () => {
            assert(status.isRedirect(302));
        });
    });

    describe("isRetry", () => {
        it("should include 504", () => {
            assert(status.isRetry(504));
        });
    });
});
