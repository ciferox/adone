const waterfall = require("async/waterfall");
const each = require("async/each");

const {
    p2p: { crypto, PeerId, record: { selection, validator, Record } }
} = adone;

const fixture = require("./fixtures/go-record.js");

const date = new Date(Date.UTC(2012, 1, 25, 10, 10, 10, 10));

describe("p2p", "record", () => {
    it("new", () => {
        const rec = new Record(
            Buffer.from("hello"),
            Buffer.from("world")
        );

        expect(rec).to.have.property("key").eql(Buffer.from("hello"));
        expect(rec).to.have.property("value").eql(Buffer.from("world"));
    });

    it("serialize & deserialize", () => {
        const rec = new Record(Buffer.from("hello"), Buffer.from("world"), date);
        const dec = Record.deserialize(rec.serialize());

        expect(dec).to.have.property("key").eql(Buffer.from("hello"));
        expect(dec).to.have.property("value").eql(Buffer.from("world"));
        expect(dec.timeReceived).to.be.eql(date);
    });

    describe("go interop", () => {
        it("no signature", () => {
            const dec = Record.deserialize(fixture.serialized);
            expect(dec).to.have.property("key").eql(Buffer.from("hello"));
            expect(dec).to.have.property("value").eql(Buffer.from("world"));
        });
    });

    describe("selection", () => {
        const records = [Buffer.alloc(0), Buffer.from("hello")];

        describe("bestRecord", () => {
            it("throws no records given when no records received", () => {
                expect(
                    () => selection.bestRecord({}, Buffer.from("/"), [])
                ).to.throw(
                    /No records given/
                );
            });

            it("throws on missing selector in the record key", () => {
                expect(
                    () => selection.bestRecord({}, Buffer.from("/"), records)
                ).to.throw(
                    /Record key does not have a selector function/
                );
            });

            it("throws on unknown key prefix", () => {
                expect(
                    () => selection.bestRecord({ world() { } }, Buffer.from("/hello/"), records)
                ).to.throw(
                    /Unrecognized key prefix: hello/
                );
            });

            it("returns the index from the matching selector", () => {
                const selectors = {
                    hello(k, recs) {
                        expect(k).to.be.eql(Buffer.from("/hello/world"));
                        expect(recs).to.be.eql(records);

                        return 1;
                    }
                };

                expect(
                    selection.bestRecord(selectors, Buffer.from("/hello/world"), records)
                ).to.equal(
                    1
                );
            });
        });

        describe("selectors", () => {
            it("public key", () => {
                expect(
                    selection.selectors.pk(Buffer.from("/hello/world"), records)
                ).to.equal(
                    0
                );
            });
        });
    });

    describe("utils", () => {
        const srcPath = (...args) => adone.getPath("lib", "glosses", "p2p", "record", ...args);
        const utils = require(srcPath("utils"));

        const dates = [[
            new Date(Date.UTC(2016, 0, 1, 8, 22, 33, 392)),
            "2016-01-01T08:22:33.392000000Z"
        ], [
            new Date(Date.UTC(2016, 11, 30, 20, 2, 3, 392)),
            "2016-12-30T20:02:03.392000000Z"
        ], [
            new Date(Date.UTC(2016, 11, 30, 20, 2, 5, 297)),
            "2016-12-30T20:02:05.297000000Z"
        ], [
            new Date(Date.UTC(2012, 1, 25, 10, 10, 10, 10)),
            "2012-02-25T10:10:10.10000000Z"
        ]];


        it("toRFC3339", () => {
            dates.forEach((c) => {
                expect(utils.toRFC3339(c[0])).to.be.eql(c[1]);
            });
        });

        it("parseRFC3339", () => {
            dates.forEach((c) => {
                expect(utils.parseRFC3339(c[1])).to.be.eql(c[0]);
            });
        });

        it("to and from RFC3339", () => {
            dates.forEach((c) => {
                expect(
                    utils.parseRFC3339(utils.toRFC3339(c[0]))
                ).to.be.eql(
                    c[0]
                );
                expect(
                    utils.toRFC3339(utils.parseRFC3339(c[1]))
                ).to.be.eql(
                    c[1]
                );
            });
        });
    });

    describe("validator", () => {
        const fixture = require("./fixtures/go-key-records.js");

        const generateCases = (hash) => {
            return {
                valid: {
                    publicKey: [
                        Buffer.concat([
                            Buffer.from("/pk/"),
                            hash
                        ])
                    ]
                },
                invalid: {
                    publicKey: [
                        // missing hashkey
                        Buffer.from("/pk/"),
                        // not the hash of a key
                        Buffer.concat([
                            Buffer.from("/pk/"),
                            Buffer.from("random")
                        ]),
                        // missing prefix
                        hash
                    ]
                }
            };
        };


        let key;
        let hash;
        let cases;

        before((done) => {
            waterfall([
                (cb) => crypto.keys.generateKeyPair("rsa", 1024, cb),
                (pair, cb) => {
                    key = pair;
                    pair.public.hash(cb);
                },
                (_hash, cb) => {
                    hash = _hash;
                    cases = generateCases(hash);
                    cb();
                }
            ], done);
        });

        describe("verifyRecord", () => {
            it("calls matching validator", (done) => {
                const k = Buffer.from("/hello/you");
                const rec = new Record(k, Buffer.from("world"), new PeerId(hash));

                const validators = {
                    hello: {
                        func(key, value, cb) {
                            expect(key).to.eql(k);
                            expect(value).to.eql(Buffer.from("world"));
                            cb();
                        },
                        sign: false
                    }
                };
                validator.verifyRecord(validators, rec, done);
            });

            it("calls not matching any validator", (done) => {
                const k = Buffer.from("/hallo/you");
                const rec = new Record(k, Buffer.from("world"), new PeerId(hash));

                const validators = {
                    hello: {
                        func(key, value, cb) {
                            expect(key).to.eql(k);
                            expect(value).to.eql(Buffer.from("world"));
                            cb();
                        },
                        sign: false
                    }
                };
                validator.verifyRecord(validators, rec, (err) => {
                    expect(err).to.exist();
                    done();
                });
            });
        });

        describe("validators", () => {
            it("exports pk", () => {
                expect(validator.validators).to.have.keys(["pk"]);
            });

            describe("public key", () => {
                it("exports func and sing", () => {
                    const pk = validator.validators.pk;

                    expect(pk).to.have.property("func");
                    expect(pk).to.have.property("sign", false);
                });

                it("does not error on valid record", (done) => {
                    each(cases.valid.publicKey, (k, cb) => {
                        validator.validators.pk.func(k, key.public.bytes, cb);
                    }, done);
                });

                it("throws on invalid records", (done) => {
                    each(cases.invalid.publicKey, (k, cb) => {
                        validator.validators.pk.func(k, key.public.bytes, (err) => {
                            expect(err).to.exist();
                            cb();
                        });
                    }, done);
                });
            });
        });

        describe("go interop", () => {
            it("record with key from from go", (done) => {
                const pubKey = crypto.keys.unmarshalPublicKey(fixture.publicKey);

                pubKey.hash((err, hash) => {
                    expect(err).to.not.exist();
                    const k = Buffer.concat([Buffer.from("/pk/"), hash]);

                    validator.validators.pk.func(k, pubKey.bytes, done);
                });
            });
        });
    });

});
