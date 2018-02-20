const testId = require("./fixtures/sample-id");
const goId = require("./fixtures/go-private-key");

const {
    is,
    multi,
    net: { p2p: { PeerId, crypto } },
    std: { util },
    error
} = adone;

const testIdHex = testId.id;
const testIdBytes = multi.hash.fromHexString(testId.id);
const testIdB58String = multi.hash.toB58String(testIdBytes);

// Test options for making PeerId.create faster
// INSECURE, only use when testing
const testOpts = {
    bits: 512
};

describe("PeerId", () => {
    it("create an instance without id", () => {
        assert.throws(() => new PeerId(), error.NotValid);
    });

    it("create a new id", () => {
        const id = PeerId.create(testOpts);
        expect(id.asBase58().length).to.equal(46);
    });

    it("isPeerId", () => {
        const id = PeerId.create(testOpts);
        expect(is.p2pPeerId(id)).to.equal(true);
        expect(is.p2pPeerId("aaa")).to.equal(false);
        expect(is.p2pPeerId(Buffer.from("batatas"))).to.equal(false);
    });

    it("throws on changing the id", function () {
        this.timeout(10000);
        const id = PeerId.create(testOpts);
        expect(id.asBase58().length).to.equal(46);
        assert.throws(() => {
            id.id = Buffer.from("hello");
        }, adone.error.NotAllowed);
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
        const id = PeerId.createFromBase58(testIdB58String);
        expect(testIdB58String).to.equal(id.asBase58());
    });

    it("Recreate from a Public Key", () => {
        const id = PeerId.createFromPubKey(testId.pubKey);
        expect(testIdB58String).to.equal(id.asBase58());
    });

    it("Recreate from a Private Key", () => {
        const id = PeerId.createFromPrivKey(testId.privKey);
        expect(testIdB58String).to.equal(id.asBase58());

        const encoded = Buffer.from(testId.privKey, "base64");
        const id2 = PeerId.createFromPrivKey(encoded);
        expect(testIdB58String).to.equal(id2.asBase58());
        expect(id.marshalPubKey()).to.deep.equal(id2.marshalPubKey());
    });

    it("Compare generated ID with one created from PubKey", () => {
        const id1 = PeerId.create(testOpts);
        const id2 = PeerId.createFromPubKey(id1.marshalPubKey());
        expect(id1.id).to.be.eql(id2.id);
    });

    it("Works with default options", function () {
        this.timeout(10000);
        const id = PeerId.create();
        expect(id.asBase58().length).to.equal(46);
    });

    it("Non-default # of bits", function () {
        this.timeout(1000 * 60);
        const shortId = PeerId.create(testOpts);
        const longId = PeerId.create({ bits: 1024 });
        expect(shortId.privKey.bytes.length).is.below(longId.privKey.bytes.length);
    });

    it("Pretty printing", () => {
        const id1 = PeerId.create(testOpts);
        const id2 = PeerId.createFromPrivKey(id1.toJSON().privKey);
        expect(id1.toJSON()).to.be.eql(id2.toJSON());
    });

    it("toBytes", () => {
        const id = PeerId.createFromHexString(testIdHex);
        expect(id.toBytes().toString("hex")).to.equal(testIdBytes.toString("hex"));
    });

    it("isEqual", () => {
        const id1 = PeerId.create(testOpts);
        const id2 = PeerId.create(testOpts);
        expect(id1.isEqual(id1)).to.equal(true);
        expect(id1.isEqual(id2)).to.equal(false);
        expect(id1.isEqual(id1.id)).to.equal(true);
        expect(id1.isEqual(id2.id)).to.equal(false);
    });

    describe("fromJSON", () => {
        it("full node", () => {
            const id = PeerId.create(testOpts);
            const other = PeerId.createFromJSON(id.toJSON());
            expect(id.asBase58()).to.equal(other.asBase58());
            expect(id.privKey.bytes).to.eql(other.privKey.bytes);
            expect(id.pubKey.bytes).to.eql(other.pubKey.bytes);
        });

        it("only id", () => {
            const key = crypto.keys.generateKeyPair("rsa", 1024);
            const digest = key.public.hash();
            const id = PeerId.createFromBytes(digest);
            assert.notExists(id.privKey);
            assert.notExists(id.pubKey);

            const other = PeerId.createFromJSON(id.toJSON());
            expect(id.asBase58()).to.equal(other.asBase58());
        });

        it("go interop", () => {
            const id = PeerId.createFromJSON(goId);
            const digest = id.privKey.public.hash();
            expect(multi.hash.toB58String(digest)).to.eql(goId.id);
        });
    });

    it("set privKey (valid)", () => {
        const peerId = PeerId.create(testOpts);
        peerId.privKey = peerId._privKey;
        peerId.isValid();
    });

    it("set pubKey (valid)", () => {
        const peerId = PeerId.create(testOpts);
        peerId.pubKey = peerId._pubKey;
        peerId.isValid();
    });

    it("set privKey (invalid)", () => {
        const peerId = PeerId.create(testOpts);
        peerId.privKey = Buffer.from("bufff");
        assert.throws(() => peerId.isValid());
    });

    it("set pubKey (invalid)", () => {
        const peerId = PeerId.create(testOpts);
        peerId.pubKey = Buffer.from("buffff");
        assert.throws(() => peerId.isValid());
    });

    describe("returns error via cb instead of crashing", () => {
        const garbage = [Buffer.from("00010203040506070809", "hex"), {}, null, false, undefined, true, 1, 0, Buffer.from(""), "aGVsbG93b3JsZA==", "helloworld", ""];

        const fncs = ["createFromPubKey", "createFromPrivKey", "createFromJSON"];

        garbage.forEach((garbage) => {
            fncs.forEach((fnc) => {
                it(`${fnc}(${util.inspect(garbage)})`, () => {
                    assert.throws(() => PeerId[fnc](garbage));
                });
            });
        });
    });

    describe("throws on inconsistent data", () => {
        let k1;
        let k2;
        let k3;

        before(() => {
            k1 = crypto.keys.generateKeyPair("rsa", 512);
            k2 = crypto.keys.generateKeyPair("rsa", 512);
            k3 = crypto.keys.generateKeyPair("rsa", 512);
        });

        it("missmatch private - public key", () => {
            const digest = k1.public.hash();
            assert.throws(() => new PeerId(digest, k1, k2.public), /Inconsistent arguments/);
        });

        it("missmatch id - private - public key", () => {
            const digest = k1.public.hash();
            assert.throws(() => new PeerId(digest, k1, k3.public), /Inconsistent arguments/);
        });

        it("invalid id", () => {
            assert.throws(() => new PeerId("hello world"), /Invalid id/);
        });
    });
});
