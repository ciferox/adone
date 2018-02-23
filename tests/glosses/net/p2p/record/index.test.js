const fixture = require("./fixtures/go-record.js");

const {
    crypto,
    net: { p2p: { record } }
} = adone;

const { Record } = record;

const date = new Date(Date.UTC(2012, 1, 25, 10, 10, 10, 10));

describe("record", () => {
    let key;
    let otherKey;
    let id;

    before(() => {
        otherKey = crypto.keys.generateKeyPair("rsa", 1024);
        key = crypto.keys.generateKeyPair("rsa", 1024);
        id = crypto.Identity.createFromPrivKey(key.bytes);
    });

    it("new", () => {
        const rec = new Record(
            Buffer.from("hello"),
            Buffer.from("world"),
            id
        );

        expect(rec).to.have.property("key").eql(Buffer.from("hello"));
        expect(rec).to.have.property("value").eql(Buffer.from("world"));
        expect(rec).to.have.property("author").eql(id);
    });

    it("serialize & deserialize", () => {
        const rec = new Record(Buffer.from("hello"), Buffer.from("world"), id, date);
        const dec = Record.deserialize(rec.serialize());

        expect(dec).to.have.property("key").eql(Buffer.from("hello"));
        expect(dec).to.have.property("value").eql(Buffer.from("world"));
        expect(dec).to.have.property("author");
        expect(dec.author.id.equals(id.id)).to.be.eql(true);
        expect(dec.timeReceived).to.be.eql(date);
    });

    it("serializeSigned", () => {
        const rec = new Record(Buffer.from("hello2"), Buffer.from("world2"), id, date);
        const enc = rec.serializeSigned(key);
        const dec = Record.deserialize(enc);
        expect(dec).to.have.property("key").eql(Buffer.from("hello2"));
        expect(dec).to.have.property("value").eql(Buffer.from("world2"));
        expect(dec).to.have.property("author");
        expect(dec.author.id.equals(id.id)).to.be.eql(true);
        expect(dec.timeReceived).to.be.eql(date);

        const blob = rec.blobForSignature();

        const signature = key.sign(blob);
        expect(dec.signature).to.be.eql(signature);
    });

    describe("verifySignature", () => {
        it("valid", () => {
            const rec = new Record(Buffer.from("hello"), Buffer.from("world"), id);

            rec.serializeSigned(key);
            rec.verifySignature(key.public);
        });

        it("invalid", () => {
            const rec = new Record(Buffer.from("hello"), Buffer.from("world"), id);
            rec.serializeSigned(key);
            assert.throws(() => rec.verifySignature(otherKey.public), /Invalid record signature/);
        });
    });

    describe("go interop", () => {
        it("no signature", () => {
            const dec = Record.deserialize(fixture.serialized);
            expect(dec).to.have.property("key").eql(Buffer.from("hello"));
            expect(dec).to.have.property("value").eql(Buffer.from("world"));
            expect(dec).to.have.property("author");
        });

        it("with signature", () => {
            const dec = Record.deserialize(fixture.serializedSigned);
            expect(dec).to.have.property("key").eql(Buffer.from("hello"));
            expect(dec).to.have.property("value").eql(Buffer.from("world"));
            expect(dec).to.have.property("author");
            expect(dec).to.have.property("signature");
        });
    });
});
