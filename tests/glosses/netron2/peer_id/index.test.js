const parallel = require("async/parallel");
const testId = require("./fixtures/sample-id");
const goId = require("./fixtures/go-private-key");

const {
    multi,
    netron2: { PeerId, crypto },
    std: { util }
} = adone;

const testIdHex = testId.id;
const testIdBytes = multi.hash.fromHexString(testId.id);
const testIdB58String = multi.hash.toB58String(testIdBytes);

// Test options for making PeerId.create faster
// INSECURE, only use when testing
const testOpts = {
    bits: 512
};

describe("netron2", "PeerId", () => {
    it("create an id without 'new'", () => {
        assert.throws(() => new PeerId(), Error);
    });

    it("create a new id", (done) => {
        PeerId.create(testOpts, (err, id) => {
            assert.notExists(err);
            expect(id.toB58String().length).to.equal(46);
            done();
        });
    });

    it("isPeerId", (done) => {
        PeerId.create(testOpts, (err, id) => {
            assert.notExists(err);
            expect(PeerId.isPeerId(id)).to.equal(true);
            expect(PeerId.isPeerId("aaa")).to.equal(false);
            expect(PeerId.isPeerId(Buffer.from("batatas"))).to.equal(false);
            done();
        });
    });

    it("throws on changing the id", function (done) {
        this.timeout(10000);
        PeerId.create(testOpts, (err, id) => {
            assert.notExists(err);
            expect(id.toB58String().length).to.equal(46);
            assert.throws(() => {
                id.id = Buffer.from("hello");
            }, /immutable/);
            done();
        });
    });

    it("recreate an Id from Hex string", () => {
        const id = PeerId.createFromHexString(testIdHex);
        expect(testIdBytes).to.deep.equal(id.id);
    });

    it("Recreate an Id from a Buffer", () => {
        const id = PeerId.createFromBytes(testIdBytes);
        expect(testId.id).to.equal(id.toHexString());
    });

    it("Recreate a B58 String", () => {
        const id = PeerId.createFromB58String(testIdB58String);
        expect(testIdB58String).to.equal(id.toB58String());
    });

    it("Recreate from a Public Key", (done) => {
        PeerId.createFromPubKey(testId.pubKey, (err, id) => {
            assert.notExists(err);
            expect(testIdB58String).to.equal(id.toB58String());
            done();
        });
    });

    it("Recreate from a Private Key", (done) => {
        PeerId.createFromPrivKey(testId.privKey, (err, id) => {
            assert.notExists(err);
            expect(testIdB58String).to.equal(id.toB58String());

            const encoded = Buffer.from(testId.privKey, "base64");
            PeerId.createFromPrivKey(encoded, (err, id2) => {
                assert.notExists(err);
                expect(testIdB58String).to.equal(id2.toB58String());
                expect(id.marshalPubKey()).to.deep.equal(id2.marshalPubKey());
                done();
            });
        });
    });

    it("Compare generated ID with one created from PubKey", (done) => {
        PeerId.create(testOpts, (err, id1) => {
            assert.notExists(err);

            PeerId.createFromPubKey(id1.marshalPubKey(), (err, id2) => {
                assert.notExists(err);
                expect(id1.id).to.be.eql(id2.id);
                done();
            });
        });
    });

    it("Works with default options", function (done) {
        this.timeout(10000);
        PeerId.create((err, id) => {
            assert.notExists(err);
            expect(id.toB58String().length).to.equal(46);
            done();
        });
    });

    it("Non-default # of bits", function (done) {
        this.timeout(1000 * 60);
        PeerId.create(testOpts, (err, shortId) => {
            assert.notExists(err);
            PeerId.create({ bits: 1024 }, (err, longId) => {
                assert.notExists(err);
                expect(shortId.privKey.bytes.length).is.below(longId.privKey.bytes.length);
                done();
            });
        });
    });

    it("Pretty printing", (done) => {
        PeerId.create(testOpts, (err, id1) => {
            assert.notExists(err);
            PeerId.createFromPrivKey(id1.toPrint().privKey, (err, id2) => {
                assert.notExists(err);
                expect(id1.toPrint()).to.be.eql(id2.toPrint());
                done();
            });
        });
    });

    it("toBytes", () => {
        const id = PeerId.createFromHexString(testIdHex);
        expect(id.toBytes().toString("hex")).to.equal(testIdBytes.toString("hex"));
    });

    it("isEqual", (done) => {
        parallel([
            (cb) => PeerId.create(testOpts, cb),
            (cb) => PeerId.create(testOpts, cb)
        ], (err, ids) => {
            assert.notExists(err);
            expect(ids[0].isEqual(ids[0])).to.equal(true);
            expect(ids[0].isEqual(ids[1])).to.equal(false);
            expect(ids[0].isEqual(ids[0].id)).to.equal(true);
            expect(ids[0].isEqual(ids[1].id)).to.equal(false);
            done();
        });
    });

    describe("fromJSON", () => {
        it("full node", (done) => {
            PeerId.create(testOpts, (err, id) => {
                assert.notExists(err);

                PeerId.createFromJSON(id.toJSON(), (err, other) => {
                    assert.notExists(err);
                    expect(id.toB58String()).to.equal(other.toB58String());
                    expect(id.privKey.bytes).to.eql(other.privKey.bytes);
                    expect(id.pubKey.bytes).to.eql(other.pubKey.bytes);
                    done();
                });
            });
        });

        it("only id", (done) => {
            crypto.keys.generateKeyPair("RSA", 1024, (err, key) => {
                assert.notExists(err);
                key.public.hash((err, digest) => {
                    assert.notExists(err);

                    const id = PeerId.createFromBytes(digest);
                    assert.notExists(id.privKey);
                    assert.notExists(id.pubKey);

                    PeerId.createFromJSON(id.toJSON(), (err, other) => {
                        assert.notExists(err);
                        expect(id.toB58String()).to.equal(other.toB58String());
                        done();
                    });
                });
            });
        });

        it("go interop", (done) => {
            PeerId.createFromJSON(goId, (err, id) => {
                assert.notExists(err);
                id.privKey.public.hash((err, digest) => {
                    assert.notExists(err);
                    expect(multi.hash.toB58String(digest)).to.eql(goId.id);
                    done();
                });
            });
        });
    });

    it("set privKey (valid)", (done) => {
        PeerId.create(testOpts, (err, peerId) => {
            assert.notExists(err);
            peerId.privKey = peerId._privKey;
            peerId.isValid(done);
        });
    });

    it("set pubKey (valid)", (done) => {
        PeerId.create(testOpts, (err, peerId) => {
            assert.notExists(err);
            peerId.pubKey = peerId._pubKey;
            peerId.isValid(done);
        });
    });

    it("set privKey (invalid)", (done) => {
        PeerId.create(testOpts, (err, peerId) => {
            assert.notExists(err);
            peerId.privKey = Buffer.from("bufff");
            peerId.isValid((err) => {
                assert.exists(err);
                done();
            });
        });
    });

    it("set pubKey (invalid)", (done) => {
        PeerId.create(testOpts, (err, peerId) => {
            assert.notExists(err);
            peerId.pubKey = Buffer.from("buffff");
            peerId.isValid((err) => {
                assert.exists(err);
                done();
            });
        });
    });

    describe("returns error via cb instead of crashing", () => {
        const garbage = [Buffer.from("00010203040506070809", "hex"), {}, null, false, undefined, true, 1, 0, Buffer.from(""), "aGVsbG93b3JsZA==", "helloworld", ""];

        const fncs = ["createFromPubKey", "createFromPrivKey", "createFromJSON"];

        garbage.forEach((garbage) => {
            fncs.forEach((fnc) => {
                it(`${fnc}(${util.inspect(garbage)})`, (cb) => {
                    PeerId[fnc](garbage, (err, res) => {
                        assert.exists(err);
                        assert.notExists(res);
                        cb();
                    });
                });
            });
        });
    });

    describe("throws on inconsistent data", () => {
        let k1;
        let k2;
        let k3;

        before((done) => {
            parallel([
                (cb) => crypto.keys.generateKeyPair("RSA", 512, cb),
                (cb) => crypto.keys.generateKeyPair("RSA", 512, cb),
                (cb) => crypto.keys.generateKeyPair("RSA", 512, cb)
            ], (err, keys) => {
                assert.notExists(err);

                k1 = keys[0];
                k2 = keys[1];
                k3 = keys[2];
                done();
            });
        });

        it("missmatch private - public key", (done) => {
            k1.public.hash((err, digest) => {
                assert.notExists(err);
                assert.throws(() => new PeerId(digest, k1, k2.public), /Inconsistent arguments/);
                done();
            });
        });

        it("missmatch id - private - public key", (done) => {
            k1.public.hash((err, digest) => {
                assert.notExists(err);
                assert.throws(() => new PeerId(digest, k1, k3.public), /Inconsistent arguments/);
                done();
            });
        });

        it("invalid id", () => {
            assert.throws(() => new PeerId("hello world"), /Invalid id/);
        });
    });
});
