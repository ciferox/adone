const {
    fake
} = adone;

describe("fake.js", () => {
    describe("fake()", () => {
        it("replaces a token with a random value for a method with no parameters", () => {
            const name = fake.fake("{{phone.phoneNumber}}");
            assert.ok(name.match(/\d/));
        });

        it("replaces multiple tokens with random values for methods with no parameters", () => {
            const name = fake.fake("{{helpers.randomize}}{{helpers.randomize}}{{helpers.randomize}}");
            assert.ok(name.match(/[abc]{3}/));
        });

        it("replaces a token with a random value for a methods with a simple parameter", () => {
            const arr = ["one", "two", "three"];
            const random = fake.fake('{{helpers.slugify("Will This Work")}}');
            assert.ok(random === "Will-This-Work");
        });

        it("replaces a token with a random value for a method with an array parameter", () => {
            const arr = ["one", "two", "three"];
            const random = fake.fake('{{helpers.randomize(["one", "two", "three"])}}');
            assert.ok(arr.indexOf(random) > -1);
        });
    });
});
