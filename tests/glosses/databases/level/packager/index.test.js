const {
    assertion,
    database: { level: { packager } }
} = adone;
assertion.use(assertion.extension.checkmark);

describe("database", "level", "packager", () => {
    it.skip("Level constructor has access to levelup errors", () => {
        function Down() { }
        assert.ok(packager(Down).errors, ".errors property set on constructor");
    });

    it("Level constructor relays .destroy and .repair if they exist", (done) => {
        expect(8).checks(done);

        const test = function (method) {
            const args = [];

            function Down() { }

            Down[method] = function () {
                assert.sameMembers([].slice.call(arguments), args, "supports variadic arguments");
                expect(true).to.be.true.mark();
            };

            const level = packager(Down);
            

            for (let i = 0; i < 4; i++) {
                args.push(i);
                level[method].apply(level, args);
            }
        };

        test("destroy");
        test("repair");
    });

    it("Level constructor with default options", (done) => {
        expect(2).checks(done);

        function Down(location) {
            assert.equal(location, "location", "location is correct");
            expect(true).to.be.true.mark();
            return {
                open(opts, cb) { }
            };
        }
        const levelup = packager(Down)("location");
        assert.equal(levelup.options.keyEncoding, "utf8");
        assert.equal(levelup.options.valueEncoding, "utf8");
        expect(true).to.be.true.mark();
    });

    it("Level constructor with callback", (done) => {
        expect(2).checks(done);
        function Down(location) {
            assert.equal(location, "location", "location is correct");
            return {
                open(opts, cb) {
                    // t.pass("open called");
                    process.nextTick(cb);
                    expect(true).to.be.true.mark();
                }
            };
        }
        packager(Down)("location", (err, db) => {
            assert.notExists(err);
            assert.ok(db, "db set in callback");
            expect(true).to.be.true.mark();
        });
    });

    it("Level constructor with custom options", (done) => {
        expect(2).checks(done);
        const Down = function (location) {
            assert.equal(location, "location", "location is correct");
            expect(true).to.be.true.mark();
            return {
                open(opts, cb) { }
            };
        };
        const levelup = packager(Down)("location", {
            keyEncoding: "binary",
            valueEncoding: "binary"
        });
        assert.equal(levelup.options.keyEncoding, "binary");
        assert.equal(levelup.options.valueEncoding, "binary");
        expect(true).to.be.true.mark();
    });
});
