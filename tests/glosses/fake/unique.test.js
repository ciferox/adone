const {
    fake
} = adone;

describe("fake", "unique", () => {
    describe("unique()", () => {

        it("is able to call a function with no arguments and return a result", () => {
            const result = fake.unique(fake.internet.email);
            assert.equal(typeof result, "string");
        });

        it("is able to call a function with arguments and return a result", () => {
            const result = fake.unique(fake.internet.email, ["a", "b", "c"]); // third argument is provider, or domain for email
            assert.ok(result.match(/\@c/));
        });

        it("is able to call a function with arguments and return a result", () => {
            const result = fake.unique(fake.internet.email, ["a", "b", "c"]); // third argument is provider, or domain for email
            assert.ok(result.match(/\@c/));
        });

        it("is able to exclude results as array", () => {
            const result = fake.unique(fake.internet.protocol, [], { exclude: ["https"] });
            assert.equal(result, "http");
        });

        it("is able to limit unique call by maxTime in ms", () => {
            let result;
            try {
                result = fake.unique(fake.internet.protocol, [], { maxTime: 1, maxRetries: 9999, exclude: ["https", "http"] });
            } catch (err) {
                assert.equal(err.message.substr(0, 16), "exceeded maxTime");
            }
        });

        it("is able to limit unique call by maxRetries", () => {
            let result;
            try {
                result = fake.unique(fake.internet.protocol, [], { maxTime: 5000, maxRetries: 5, exclude: ["https", "http"] });
            } catch (err) {
                assert.equal(err.message.substr(0, 19), "exceeded maxRetries");
            }
        });

        it("is able to call a function with arguments and return a result", () => {
            const result = fake.unique(fake.internet.email, ["a", "b", "c"]); // third argument is provider, or domain for email
            assert.ok(result.match(/\@c/));
        });

    });
});
