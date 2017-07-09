describe("database", "redis", "unit", "Command", () => {
    const { database: { redis: { __: { Command } } } } = adone;

    describe("constructor()", () => {
        it("should flatten the args", () => {
            const command = new Command("get", ["foo", ["bar", ["zoo", "zoo"]]]);
            expect(command.args).to.be.deep.equal(["foo", "bar", "zoo,zoo"]);
        });
    });

    describe("toWritable()", () => {
        it("should return correct string", () => {
            const command = new Command("get", ["foo", "bar", "zooo"]);
            expect(command.toWritable()).to.be.equal("*4\r\n$3\r\nget\r\n$3\r\nfoo\r\n$3\r\nbar\r\n$4\r\nzooo\r\n");
        });

        it("should return buffer when there's at least one arg is a buffer", () => {
            const command = new Command("get", ["foo", Buffer.from("bar"), "zooo"]);
            const result = command.toWritable();
            expect(result).to.be.instanceof(Buffer);
            expect(result.toString()).to.be.equal("*4\r\n$3\r\nget\r\n$3\r\nfoo\r\n$3\r\nbar\r\n$4\r\nzooo\r\n");
        });
    });

    describe("resolve()", () => {
        it("should return buffer when replyEncoding is not set", (done) => {
            const command = new Command("get", ["foo"], { replyEncoding: null }, (err, result) => {
                expect(result).to.be.instanceof(Buffer);
                expect(result.toString()).to.be.equal("foo");
                done();
            });
            command.resolve(Buffer.from("foo"));
        });

        it("should covert result to string if replyEncoding is specified", (done) => {
            const command = new Command("get", ["foo"], { replyEncoding: "utf8" }, (err, result) => {
                expect(result).to.be.equal("foo");
                done();
            });
            command.resolve(Buffer.from("foo"));
        });

        it("should regard replyEncoding", (done) => {
            const base64 = Buffer.from("foo").toString("base64");
            const command = new Command("get", ["foo"], { replyEncoding: "base64" }, (err, result) => {
                expect(result).to.be.equal(base64);
                done();
            });
            command.resolve(Buffer.from("foo"));
        });
    });

    describe("getKeys()", () => {
        it("should return keys", () => {
            const getKeys = (commandName, args) => {
                const command = new Command(commandName, args);
                return command.getKeys();
            };

            expect(getKeys("get", ["foo"])).to.be.deep.equal(["foo"]);
            expect(getKeys("mget", ["foo", "bar"])).to.be.deep.equal(["foo", "bar"]);
            expect(getKeys("mset", ["foo", "v1", "bar", "v2"])).to.be.deep.equal(["foo", "bar"]);
            expect(getKeys("hmset", ["key", "foo", "v1", "bar", "v2"])).to.be.deep.equal(["key"]);
            expect(getKeys("blpop", ["key1", "key2", "17"])).to.be.deep.equal(["key1", "key2"]);
            expect(getKeys("evalsha", ["23123", "2", "foo", "bar", "zoo"])).to.be.deep.equal(["foo", "bar"]);
            expect(getKeys("evalsha", ["23123", 2, "foo", "bar", "zoo"])).to.be.deep.equal(["foo", "bar"]);
            expect(getKeys("sort", ["key"])).to.be.deep.equal(["key"]);
            expect(getKeys("sort", ["key", "BY", "hash:*->field"])).to.be.deep.equal(["key", "hash:*->field"]);
            expect(getKeys("sort", ["key", "BY", "hash:*->field", "LIMIT", 2, 3, "GET", "gk", "GET", "#", "Get", "gh->f*", "DESC", "ALPHA", "STORE", "store"])).to.be.deep.equal(["key", "hash:*->field", "gk", "gh->f*", "store"]);
            expect(getKeys("zunionstore", ["out", 2, "zset1", "zset2", "WEIGHTS", 2, 3])).to.be.deep.equal(["out", "zset1", "zset2"]);
            expect(getKeys("zinterstore", ["out", 2, "zset1", "zset2", "WEIGHTS", 2, 3])).to.be.deep.equal(["out", "zset1", "zset2"]);
        });
    });

    describe("getSlot()", () => {
        it("should return correctly", () => {
            const expectSlot = (key, slot) => {
                expect(new Command("get", [key]).getSlot()).to.be.equal(slot);
            };

            expectSlot("123", 5970);
            expectSlot("ab{c", 4619);
            expectSlot("ab{c}2", 7365);
            expectSlot("ab{{c}2", 2150);
            expectSlot("ab{qq}{c}2", 5598);
            expectSlot("ab}", 11817);
            expectSlot("encoding", 3060);

        });
    });

    describe(".checkFlag()", () => {
        it("should return correct result", () => {
            expect(Command.checkFlag("VALID_IN_SUBSCRIBER_MODE", "ping")).to.be.true;
            expect(Command.checkFlag("VALID_IN_SUBSCRIBER_MODE", "get")).to.be.false;
            expect(Command.checkFlag("WILL_DISCONNECT", "quit")).to.be.true;
        });
    });
});
