describe("database", "redis", "unit", "redis-commands", () => {
    const { database: { redis } } = adone;
    const { commands } = adone.private(redis);

    describe(".list", () => {
        it("should be an array", () => {
            expect(commands.list).to.be.an("array");
        });

        it("should ensure every command is lowercase", () => {
            commands.list.forEach((command) => {
                expect(command.toLowerCase()).to.be.equal(command);
            });
        });

        it("should ensure quit command is added to the commands list", () => {
            expect(commands.list.indexOf("quit")).not.to.be.equal(-1);
        });

        it("should not contain multi-word commands", () => {
            commands.list.forEach((command) => {
                expect(command).not.to.include(" ");
            });
        });
    });

    describe(".exists()", () => {
        it("should return true for existing commands", () => {
            expect(commands.exists("set")).to.be.true();
            expect(commands.exists("get")).to.be.true();
            expect(commands.exists("cluster")).to.be.true();
            expect(commands.exists("quit")).to.be.true();
            expect(commands.exists("config")).to.be.true();
        });

        it("should return false for non-existing commands", () => {
            expect(commands.exists("SET")).to.be.false();
            expect(commands.exists("set get")).to.be.false();
            expect(commands.exists("other-command")).to.be.false();
        });
    });

    describe(".hasFlag()", () => {
        it("should return true if the command has the flag", () => {
            expect(commands.hasFlag("set", "write")).to.be.true();
            expect(commands.hasFlag("set", "denyoom")).to.be.true();
            expect(commands.hasFlag("select", "fast")).to.be.true();
        });

        it("should return false otherwise", () => {
            expect(commands.hasFlag("set", "fast")).to.be.false();
            expect(commands.hasFlag("set", "readonly")).to.be.false();
            expect(commands.hasFlag("select", "denyoom")).to.be.false();
            expect(commands.hasFlag("quit", "denyoom")).to.be.false();
        });

        it("should throw on unknown commands", () => {
            expect(() => {
                commands.hasFlag("UNKNOWN");
            }).to.throw(Error);
        });
    });

    describe(".getKeyIndexes()", () => {
        const index = commands.getKeyIndexes;

        it("should throw on unknown commands", () => {
            expect(() => {
                index("UNKNOWN");
            }).to.throw(Error);
        });

        it("should throw on faulty args", () => {
            expect(() => {
                index("get", "foo");
            }).to.throw(Error);
        });

        it("should return an empty array if no keys exist", () => {
            expect(index("auth", [])).to.be.deep.equal([]);
        });

        it("should return key indexes", () => {
            expect(index("set", ["foo", "bar"])).to.be.deep.equal([0]);
            expect(index("del", ["foo"])).to.be.deep.equal([0]);
            expect(index("get", ["foo"])).to.be.deep.equal([0]);
            expect(index("mget", ["foo", "bar"])).to.be.deep.equal([0, 1]);
            expect(index("mset", ["foo", "v1", "bar", "v2"])).to.be.deep.equal([0, 2]);
            expect(index("hmset", ["key", "foo", "v1", "bar", "v2"])).to.be.deep.equal([0]);
            expect(index("blpop", ["key1", "key2", "17"])).to.be.deep.equal([0, 1]);
            expect(index("evalsha", ["23123", "2", "foo", "bar", "zoo"])).to.be.deep.equal([2, 3]);
            expect(index("sort", ["key"])).to.be.deep.equal([0]);
            expect(index("zunionstore", ["out", "2", "zset1", "zset2", "WEIGHTS", "2", "3"])).to.be.deep.equal([0, 2, 3]);
            expect(index("migrate", ["127.0.0.1", 6379, "foo", 0, 0, "COPY"])).to.be.deep.equal([2]);
            expect(index("migrate", ["127.0.0.1", 6379, "", 0, 0, "REPLACE", "KEYS", "foo", "bar"])).to.be.deep.equal([7, 8]);
            expect(index("migrate", ["127.0.0.1", 6379, "", 0, 0, "KEYS", "foo", "bar"])).to.be.deep.equal([6, 7]);
        });

        it("should support numeric argument", () => {
            expect(index("evalsha", ["23123", 2, "foo", "bar", "zoo"])).to.be.deep.equal([2, 3]);
            expect(index("zinterstore", ["out", 2, "zset1", "zset2", "WEIGHTS", 2, 3])).to.be.deep.equal([0, 2, 3]);
        });

        describe("disable parseExternalKey", () => {
            it("should not parse external keys", () => {
                expect(index("sort", ["key", "BY", "hash:*->field"])).to.be.deep.equal([0, 2]);
                expect(index("sort", ["key", "BY", "hash:*->field", "LIMIT", 2, 3, "GET", "gk", "GET", "#", "Get", "gh->f*", "DESC", "ALPHA", "STORE", "store"])).to.be.deep.equal([0, 2, 7, 11, 15]);
            });
        });

        describe("enable parseExternalKey", () => {
            it("should parse external keys", () => {
                expect(index("sort", ["key", "BY", "hash:*->field"], {
                    parseExternalKey: true
                })).to.be.deep.equal([0, [2, 6]]);
                expect(index("sort", ["key", "BY", "hash:*->field", "LIMIT", 2, 3, "GET", Buffer.from("gk"), "GET", "#", "Get", "gh->f*", "DESC", "ALPHA", "STORE", "store"], {
                    parseExternalKey: true
                })).to.be.deep.equal([0, [2, 6], [7, 2], [11, 2], 15]);
            });
        });
    });
});
