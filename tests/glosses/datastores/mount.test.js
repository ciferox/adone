const series = require("async/series");

const {
    stream: { pull },
    datastore: { Key, Memory, Mount }
} = adone;

describe("Mount", () => {
    it("put - no mount", (done) => {
        const m = new Mount([]);

        m.put(new Key("hello"), Buffer.from("foo"), (err) => {
            expect(err).to.be.an("Error");
            done();
        });
    });

    it("put - wrong mount", (done) => {
        const m = new Mount([{
            datastore: new Memory(),
            prefix: new Key("cool")
        }]);

        m.put(new Key("/fail/hello"), Buffer.from("foo"), (err) => {
            expect(err).to.be.an("Error");
            done();
        });
    });

    it("put", (done) => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);

        const val = Buffer.from("hello");
        series([
            (cb) => m.put(new Key("/cool/hello"), val, cb),
            (cb) => mds.get(new Key("/hello"), (err, res) => {
                assert.notExists(err);
                expect(res).to.eql(val);
                cb();
            })
        ], done);
    });

    it("get", (done) => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);

        const val = Buffer.from("hello");
        series([
            (cb) => mds.put(new Key("/hello"), val, cb),
            (cb) => m.get(new Key("/cool/hello"), (err, res) => {
                assert.notExists(err);
                expect(res).to.eql(val);
                cb();
            })
        ], done);
    });

    it("has", (done) => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);

        const val = Buffer.from("hello");
        series([
            (cb) => mds.put(new Key("/hello"), val, cb),
            (cb) => m.has(new Key("/cool/hello"), (err, exists) => {
                assert.notExists(err);
                expect(exists).to.eql(true);
                cb();
            })
        ], done);
    });

    it("delete", (done) => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);

        const val = Buffer.from("hello");
        series([
            (cb) => m.put(new Key("/cool/hello"), val, cb),
            (cb) => m.delete(new Key("/cool/hello"), cb),
            (cb) => m.has(new Key("/cool/hello"), (err, exists) => {
                assert.notExists(err);
                expect(exists).to.eql(false);
                cb();
            }),
            (cb) => mds.has(new Key("/hello"), (err, exists) => {
                assert.notExists(err);
                expect(exists).to.eql(false);
                cb();
            })
        ], done);
    });

    it("query simple", (done) => {
        const mds = new Memory();
        const m = new Mount([{
            datastore: mds,
            prefix: new Key("cool")
        }]);

        const val = Buffer.from("hello");
        series([
            (cb) => m.put(new Key("/cool/hello"), val, cb),
            (cb) => {
                pull(
                    m.query({ prefix: "/cool" }),
                    pull.collect((err, res) => {
                        assert.notExists(err);
                        expect(res).to.eql([{
                            key: new Key("/cool/hello"),
                            value: val
                        }]);
                        cb();
                    })
                );
            }
        ], done);
    });

    describe("interface-datastore", () => {
        require("./tests")({
            setup(callback) {
                callback(null, new Mount([{
                    prefix: new Key("/a"),
                    datastore: new Memory()
                }, {
                    prefix: new Key("/z"),
                    datastore: new Memory()
                }, {
                    prefix: new Key("/q"),
                    datastore: new Memory()
                }]));
            },
            teardown(callback) {
                callback();
            }
        });
    });
});
