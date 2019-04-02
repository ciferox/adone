const {
    http: { server }
} = adone;

const { kReplySentOverwritten } = server.symbol;
const { wrapThenable } = server;

describe("", () => {
    it("should resolve immediately when reply[kReplySentOverwritten] is true", () => {
        const reply = {};
        reply[kReplySentOverwritten] = true;
        const thenable = Promise.resolve();
        wrapThenable(thenable, reply);
    });

    it("should reject immediately when reply[kReplySentOverwritten] is true", () => {
        const reply = { res: {} };
        reply[kReplySentOverwritten] = true;
        reply.log = {
            error: ({ err }) => {
                assert.strictEqual(err.message, "Reply sent already");
            }
        };

        const thenable = Promise.reject(new Error("Reply sent already"));
        wrapThenable(thenable, reply);
    });
});
