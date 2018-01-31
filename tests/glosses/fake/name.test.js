const {
    is,
    fake
} = adone;

describe("name.js", () => {
    describe("firstName()", () => {
        it("returns a random name", () => {
            stub(fake.name, "firstName").returns("foo");
            const first_name = fake.name.firstName();

            assert.equal(first_name, "foo");

            fake.name.firstName.restore();
        });
    });

    describe("lastName()", () => {
        it("returns a random name", () => {
            stub(fake.name, "lastName").returns("foo");

            const last_name = fake.name.lastName();

            assert.equal(last_name, "foo");

            fake.name.lastName.restore();
        });
    });

    describe("findName()", () => {
        it("usually returns a first name and last name", () => {
            stub(fake.random, "number").returns(5);
            const name = fake.name.findName();
            assert.ok(name);
            const parts = name.split(" ");

            assert.strictEqual(parts.length, 2);

            fake.random.number.restore();
        });

        it("occasionally returns a first name and last name with a prefix", () => {
            stub(fake.random, "number").returns(0);
            const name = fake.name.findName();
            const parts = name.split(" ");

            assert.ok(parts.length >= 3);

            fake.random.number.restore();
        });

        it("occasionally returns a first name and last name with a suffix", () => {
            stub(fake.random, "number").returns(1);
            stub(fake.name, "suffix").returns("Jr.");
            const name = fake.name.findName();
            const parts = name.split(" ");

            assert.ok(parts.length >= 3);
            assert.equal(parts[parts.length - 1], "Jr.");

            fake.name.suffix.restore();
            fake.random.number.restore();
        });

        it("needs to work with specific locales and respect the fallbacks", () => {
            fake.setLocale("en_US");
            // this will throw if this is broken
            const name = fake.name.findName();
        });
    });

    describe("title()", () => {
        it("returns a random title", () => {
            stub(fake.name, "title").returns("Lead Solutions Supervisor");

            const title = fake.name.title();

            assert.equal(title, "Lead Solutions Supervisor");

            fake.name.title.restore();
        });
    });

    describe("jobTitle()", () => {
        it("returns a job title consisting of a descriptor, area, and type", () => {
            spy(fake.random, "arrayElement");
            spy(fake.name, "jobDescriptor");
            spy(fake.name, "jobArea");
            spy(fake.name, "jobType");
            const jobTitle = fake.name.jobTitle();

            assert.ok(is.string(jobTitle));
            assert.ok(fake.random.arrayElement.calledThrice);
            assert.ok(fake.name.jobDescriptor.calledOnce);
            assert.ok(fake.name.jobArea.calledOnce);
            assert.ok(fake.name.jobType.calledOnce);

            fake.random.arrayElement.restore();
            fake.name.jobDescriptor.restore();
            fake.name.jobArea.restore();
            fake.name.jobType.restore();
        });
    });
});
