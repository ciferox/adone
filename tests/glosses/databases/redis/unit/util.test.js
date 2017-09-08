describe("database", "redis", "unit", "util", () => {
    const { x, database: { redis: { __: { util } } } } = adone;

    describe(".convertBufferToString", () => {
        it("should return correctly", () => {
            expect(
                util.convertBufferToString(Buffer.from("123"))
            ).to.eql("123");
            expect(
                util.convertBufferToString([Buffer.from("abc"), Buffer.from("abc")])
            ).to.eql(["abc", "abc"]);
            expect(
                util.convertBufferToString([Buffer.from("abc"), [[Buffer.from("abc")]]])
            ).to.eql(["abc", [["abc"]]]);
            expect(
                util.convertBufferToString([Buffer.from("abc"), 5, "b", [[Buffer.from("abc"), 4]]])
            ).to.eql(["abc", 5, "b", [["abc", 4]]]);
        });
    });

    describe(".wrapMultiResult", () => {
        it("should return correctly", () => {
            expect(util.wrapMultiResult(null)).to.eql(null);
            expect(util.wrapMultiResult([1, 2])).to.eql([[null, 1], [null, 2]]);
            const t = util.wrapMultiResult([1, 2, new Error("2")]);
            expect(t[0]).to.be.deep.equal([null, 1]);
            expect(t[1]).to.be.deep.equal([null, 2]);
            expect(t[2][0]).to.be.instanceof(Error);
            expect(t[2][0].message).to.be.equal("2");
            const error = new Error("2");
            expect(util.wrapMultiResult([1, 2, error])).to.eql([[null, 1], [null, 2], [error]]);
        });
    });

    describe(".isInt", () => {
        it("should return correctly", () => {
            expect(util.isInt(2)).to.eql(true);
            expect(util.isInt("2231")).to.eql(true);
            expect(util.isInt("s")).to.eql(false);
            expect(util.isInt("1s")).to.eql(false);
            expect(util.isInt(false)).to.eql(false);
        });
    });

    describe(".timeout", () => {
        it("should return a callback", (done) => {
            let invoked = false;
            const wrappedCallback1 = util.timeout(() => {
                invoked = true;
            }, 0);
            wrappedCallback1();

            let invokedTimes = 0;
            const wrappedCallback2 = util.timeout((err) => {
                expect(err).to.be.instanceOf(x.Timeout);
                invokedTimes += 1;
                wrappedCallback2();
                setTimeout(() => {
                    expect(invoked).to.eql(true);
                    expect(invokedTimes).to.eql(1);
                    done();
                }, 0);
            }, 0);
        });
    });

    describe(".convertObjectToArray", () => {
        it("should return correctly", () => {
            const nullObject = Object.create(null);
            nullObject.abc = "def";
            expect(util.convertObjectToArray(nullObject)).to.eql(["abc", "def"]);
            expect(util.convertObjectToArray({ 1: 2 })).to.eql(["1", 2]);
            expect(util.convertObjectToArray({ 1: "2" })).to.eql(["1", "2"]);
            expect(util.convertObjectToArray({ 1: "2", abc: "def" })).to.eql(["1", "2", "abc", "def"]);
        });
    });

    describe(".convertMapToArray", () => {
        it("should return correctly", () => {
            expect(util.convertMapToArray(new Map([["1", 2]]))).to.eql(["1", 2]);
            expect(util.convertMapToArray(new Map([[1, 2]]))).to.eql([1, 2]);
            expect(util.convertMapToArray(new Map([[1, "2"], ["abc", "def"]]))).to.eql([1, "2", "abc", "def"]);
        });
    });

    describe(".toArg", () => {
        it("should return correctly", () => {
            expect(util.toArg(null)).to.eql("");
            expect(util.toArg(undefined)).to.eql("");
            expect(util.toArg("abc")).to.eql("abc");
            expect(util.toArg(123)).to.eql("123");
        });
    });

    describe(".optimizeErrorStack", () => {
        it("should return correctly", () => {
            const error = new Error();
            const res = util.optimizeErrorStack(error, `${new Error().stack}\n@`, __dirname);
            expect(res.stack.split("\n").pop()).to.eql("@");
        });
    });

    describe(".parseURL", () => {
        it("should return correctly", () => {
            expect(util.parseURL("/tmp.sock")).to.eql({ path: "/tmp.sock" });
            expect(util.parseURL("127.0.0.1")).to.eql({ host: "127.0.0.1" });
            expect(util.parseURL("6379")).to.eql({ port: "6379" });
            expect(util.parseURL("127.0.0.1:6379")).to.eql({
                host: "127.0.0.1",
                port: "6379"
            });
            expect(util.parseURL("127.0.0.1:6379?db=2&key=value")).to.eql({
                host: "127.0.0.1",
                port: "6379",
                db: "2",
                key: "value"
            });
            expect(util.parseURL("redis://user:pass@127.0.0.1:6380/4?key=value")).to.eql({
                host: "127.0.0.1",
                port: "6380",
                db: "4",
                password: "pass",
                key: "value"
            });
            expect(util.parseURL("redis://127.0.0.1/")).to.eql({
                host: "127.0.0.1"
            });
        });
    });

    describe(".packObject", () => {
        it("should return correctly", () => {
            expect(util.packObject([1, 2])).to.eql({ 1: 2 });
            expect(util.packObject([1, "2"])).to.eql({ 1: "2" });
            expect(util.packObject([1, "2", "abc", "def"])).to.eql({ 1: "2", abc: "def" });
        });
    });
});
