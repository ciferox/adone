require("./support/setup.js");
const { shouldPass, shouldFail } = require("./support/common.js");

const {
    assertion: { expect }
} = adone;

describe("Fulfillment value assertions:", () => {
    let promise = null;

    describe("Direct tests of fulfilled promises:", () => {
        describe("Basics:", () => {
            it(".eventually.equal(42)", (done) => {
                expect(Promise.resolve(42)).to.eventually.equal(42).notify(done);
            });
            it(".eventually.be.arguments", function (done) {
                expect(Promise.resolve(arguments)).to.eventually.be.arguments.notify(done);
            });
            it(".eventually.be.empty", (done) => {
                expect(Promise.resolve([])).to.eventually.be.empty.notify(done);
            });
            it(".eventually.exist", (done) => {
                expect(Promise.resolve(true)).to.eventually.exist.notify(done);
            });
            it(".eventually.be.false", (done) => {
                expect(Promise.resolve(false)).to.eventually.be.false.notify(done);
            });
            it(".eventually.be.ok", (done) => {
                expect(Promise.resolve({})).to.eventually.be.ok.notify(done);
            });
            it(".eventually.be.true", (done) => {
                expect(Promise.resolve(true)).to.eventually.be.true.notify(done);
            });
            it(".become(true)", (done) => {
                expect(Promise.resolve(true)).to.become(true).notify(done);
            });
        });

        describe("With flags and chainable methods involved:", () => {
            it(".not.eventually.be.ok", (done) => {
                expect(Promise.resolve(false)).to.not.eventually.be.ok.notify(done);
            });
            it(".eventually.not.be.ok", (done) => {
                expect(Promise.resolve(false)).to.eventually.not.be.ok.notify(done);
            });
            it(".eventually.deep.equal({ foo: 'bar' })", (done) => {
                expect(Promise.resolve({ foo: "bar" })).to.eventually.deep.equal({ foo: "bar" }).notify(done);
            });
            it(".not.eventually.deep.equal({ foo: 'bar' })", (done) => {
                expect(Promise.resolve({ foo: "baz" })).to.not.eventually.deep.equal({ foo: "bar" }).notify(done);
            });
            it(".eventually.not.deep.equal({ foo: 'bar' })", (done) => {
                expect(Promise.resolve({ foo: "baz" })).to.eventually.not.deep.equal({ foo: "bar" }).notify(done);
            });
            it(".eventually.contain('foo')", (done) => {
                expect(Promise.resolve(["foo", "bar"])).to.eventually.contain("foo").notify(done);
            });
            it(".not.eventually.contain('foo')", (done) => {
                expect(Promise.resolve(["bar", "baz"])).to.not.eventually.contain("foo").notify(done);
            });
            it(".eventually.not.contain('foo')", (done) => {
                expect(Promise.resolve(["bar", "baz"])).to.eventually.not.contain("foo").notify(done);
            });
            it(".eventually.contain.keys('foo')", (done) => {
                expect(Promise.resolve({ foo: "bar", baz: "quux" })).to.eventually.contain.keys("foo").notify(done);
            });
            it(".not.eventually.contain.keys('foo')", (done) => {
                expect(Promise.resolve({ baz: "quux" })).to.not.eventually.contain.keys("foo").notify(done);
            });
            it(".eventually.not.contain.keys('foo')", (done) => {
                expect(Promise.resolve({ baz: "quux" })).to.eventually.not.contain.keys("foo").notify(done);
            });
            it(".eventually.be.an.instanceOf(Array)", (done) => {
                expect(Promise.resolve([])).to.eventually.be.an.instanceOf(Array).notify(done);
            });

            if (expect(Object.prototype).to.nested) {
                it(".eventually.have.nested.property('foo.bar')", (done) => {
                    expect(Promise.resolve({ foo: { bar: "baz" } })).to.eventually.have.nested.property("foo.bar", "baz")
                        .notify(done);
                });
            }
        });
    });

    describe("Chaining:", () => {
        it(".eventually.be.ok.and.equal(42)", (done) => {
            expect(Promise.resolve(42)).to.eventually.be.ok.and.equal(42).notify(done);
        });
        it(".rejected.and.notify(done)", (done) => {
            expect(Promise.reject()).to.be.rejected.and.notify(done);
        });
        it(".fulfilled.and.notify(done)", (done) => {
            expect(Promise.resolve()).to.be.fulfilled.and.notify(done);
        });
    });

    describe("On a promise fulfilled with the number 42:", () => {
        beforeEach(() => {
            promise = Promise.resolve(42);
        });

        describe(".eventually.equal(42)", () => {
            shouldPass(() => expect(promise).to.eventually.equal(42));
        });
        describe(".eventually.eql(42)", () => {
            shouldPass(() => expect(promise).to.eventually.eql(42));
        });
        describe(".eventually.be.below(9000)", () => {
            shouldPass(() => expect(promise).to.eventually.be.below(9000));
        });
        describe(".eventually.be.a('number')", () => {
            shouldPass(() => expect(promise).to.eventually.be.a("number"));
        });

        describe(".eventually.be.an.instanceOf(String)", () => {
            shouldFail({
                op: () => expect(promise).to.eventually.be.an.instanceOf(String),
                message: "42 to be an instance of String"
            });
        });
        describe(".eventually.be.false", () => {
            shouldFail({
                op: () => expect(promise).to.eventually.be.false,
                message: "to be false"
            });
        });
        describe(".eventually.be.an('object')", () => {
            shouldFail({
                op: () => expect(promise).to.eventually.be.an("object"),
                message: "to be an object"
            });
        });

        describe(".eventually.not.equal(52)", () => {
            shouldPass(() => expect(promise).to.eventually.not.equal(52));
        });
        describe(".not.eventually.equal(52)", () => {
            shouldPass(() => expect(promise).to.not.eventually.equal(52));
        });

        describe(".eventually.not.equal(42)", () => {
            shouldFail({
                op: () => expect(promise).to.eventually.not.equal(42),
                message: "not equal 42"
            });
        });
        describe(".not.eventually.equal(42)", () => {
            shouldFail({
                op: () => expect(promise).to.not.eventually.equal(42),
                message: "not equal 42"
            });
        });

        describe(".become(42)", () => {
            shouldPass(() => expect(promise).to.become(42));
        });
        describe(".become(52)", () => {
            shouldFail({
                op: () => expect(promise).to.become(52),
                message: "deeply equal 52"
            });
        });

        describe(".not.become(42)", () => {
            shouldFail({
                op: () => expect(promise).to.not.become(42),
                message: "not deeply equal 42"
            });
        });
        describe(".not.become(52)", () => {
            shouldPass(() => expect(promise).to.not.become(52));
        });
    });

    describe("On a promise fulfilled with { foo: 'bar' }:", () => {
        beforeEach(() => {
            promise = Promise.resolve({ foo: "bar" });
        });

        describe(".eventually.equal({ foo: 'bar' })", () => {
            shouldFail({
                op: () => expect(promise).to.eventually.equal({ foo: "bar" }),
                message: "to equal { foo: 'bar' }"
            });
        });
        describe(".eventually.eql({ foo: 'bar' })", () => {
            shouldPass(() => expect(promise).to.eventually.eql({ foo: "bar" }));
        });
        describe(".eventually.deep.equal({ foo: 'bar' })", () => {
            shouldPass(() => expect(promise).to.eventually.deep.equal({ foo: "bar" }));
        });
        describe(".eventually.not.deep.equal({ foo: 'bar' })", () => {
            shouldFail({
                op: () => expect(promise).to.eventually.not.deep.equal({ foo: "bar" }),
                message: "not deeply equal { foo: 'bar' }"
            });
        });
        describe(".eventually.deep.equal({ baz: 'quux' })", () => {
            shouldFail({
                op: () => expect(promise).to.eventually.deep.equal({ baz: "quux" }),
                message: "deeply equal { baz: 'quux' }"
            });
        });
        describe(".eventually.not.deep.equal({ baz: 'quux' })", () => {
            shouldPass(() => expect(promise).to.eventually.not.deep.equal({ baz: "quux" }));
        });
        describe(".become({ foo: 'bar' })", () => {
            shouldPass(() => expect(promise).to.become({ foo: "bar" }));
        });
        describe(".not.become({ foo: 'bar' })", () => {
            shouldFail({
                op: () => expect(promise).to.not.become({ foo: "bar" }),
                message: "deeply equal { foo: 'bar' }"
            });
        });

        describe(".eventually.have.property('foo').that.equals('bar')", () => {
            shouldPass(() => expect(promise).to.eventually.have.property("foo").that.equals("bar"));
        });
    });
});
