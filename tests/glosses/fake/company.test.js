const {
    is,
    fake
} = adone;

describe("company.js", () => {
    describe("companyName()", () => {

        it("sometimes returns three last names", () => {
            spy(fake.name, "lastName");
            stub(fake.random, "number").returns(2);
            const name = fake.company.companyName();
            const parts = name.split(" ");

            assert.strictEqual(parts.length, 4); // account for word 'and'
            assert.ok(fake.name.lastName.calledThrice);

            fake.random.number.restore();
            fake.name.lastName.restore();
        });

        it("sometimes returns two last names separated by a hyphen", () => {
            spy(fake.name, "lastName");
            stub(fake.random, "number").returns(1);
            const name = fake.company.companyName();
            const parts = name.split("-");

            assert.ok(parts.length >= 2);
            assert.ok(fake.name.lastName.calledTwice);

            fake.random.number.restore();
            fake.name.lastName.restore();
        });

        it("sometimes returns a last name with a company suffix", () => {
            spy(fake.company, "companySuffix");
            spy(fake.name, "lastName");
            stub(fake.random, "number").returns(0);
            const name = fake.company.companyName();
            const parts = name.split(" ");

            assert.ok(parts.length >= 2);
            assert.ok(fake.name.lastName.calledOnce);
            assert.ok(fake.company.companySuffix.calledOnce);

            fake.random.number.restore();
            fake.name.lastName.restore();
            fake.company.companySuffix.restore();
        });
    });

    describe("companySuffix()", () => {
        it("returns random value from company.suffixes array", () => {
            const suffix = fake.company.companySuffix();
            assert.ok(fake.company.suffixes().indexOf(suffix) !== -1);
        });
    });

    describe("catchPhrase()", () => {
        it("returns phrase comprising of a catch phrase adjective, descriptor, and noun", () => {
            spy(fake.random, "arrayElement");
            spy(fake.company, "catchPhraseAdjective");
            spy(fake.company, "catchPhraseDescriptor");
            spy(fake.company, "catchPhraseNoun");
            const phrase = fake.company.catchPhrase();

            assert.ok(phrase.split(" ").length >= 3);
            assert.ok(fake.random.arrayElement.calledThrice);
            assert.ok(fake.company.catchPhraseAdjective.calledOnce);
            assert.ok(fake.company.catchPhraseDescriptor.calledOnce);
            assert.ok(fake.company.catchPhraseNoun.calledOnce);

            fake.random.arrayElement.restore();
            fake.company.catchPhraseAdjective.restore();
            fake.company.catchPhraseDescriptor.restore();
            fake.company.catchPhraseNoun.restore();
        });
    });

    describe("bs()", () => {
        it("returns phrase comprising of a BS buzz, adjective, and noun", () => {
            spy(fake.random, "arrayElement");
            spy(fake.company, "bsBuzz");
            spy(fake.company, "bsAdjective");
            spy(fake.company, "bsNoun");
            const bs = fake.company.bs();

            assert.ok(is.string(bs));
            assert.ok(fake.random.arrayElement.calledThrice);
            assert.ok(fake.company.bsBuzz.calledOnce);
            assert.ok(fake.company.bsAdjective.calledOnce);
            assert.ok(fake.company.bsNoun.calledOnce);

            fake.random.arrayElement.restore();        
            fake.company.bsBuzz.restore();
            fake.company.bsAdjective.restore();
            fake.company.bsNoun.restore();
        });
    });
});
