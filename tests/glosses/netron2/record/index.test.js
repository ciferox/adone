const waterfall = require("async/waterfall");
const parallel = require("async/parallel");
const fixture = require("./fixtures/go-record.js");

const {
    netron2: { PeerId, crypto, record }
} = adone;

const { Record } = record;

const date = new Date(Date.UTC(2012, 1, 25, 10, 10, 10, 10));

describe("record", () => {
    let key;
    let otherKey;
    let id;

    before((done) => {
        waterfall([
            (cb) => parallel([
                (cb) => crypto.keys.generateKeyPair("rsa", 1024, cb),
                (cb) => crypto.keys.generateKeyPair("rsa", 1024, cb)
            ], cb),
            (keys, cb) => {
                otherKey = keys[0];
                key = keys[1];

                PeerId.createFromPrivKey(key.bytes, cb);
            },
            (_id, cb) => {
                id = _id;

                cb();
            }
        ], done);
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

    it("serializeSigned", (done) => {
        const rec = new Record(Buffer.from("hello2"), Buffer.from("world2"), id, date);
        rec.serializeSigned(key, (err, enc) => {
            assert.notExists(err);

            const dec = Record.deserialize(enc);
            expect(dec).to.have.property("key").eql(Buffer.from("hello2"));
            expect(dec).to.have.property("value").eql(Buffer.from("world2"));
            expect(dec).to.have.property("author");
            expect(dec.author.id.equals(id.id)).to.be.eql(true);
            expect(dec.timeReceived).to.be.eql(date);

            const blob = rec.blobForSignature();

            key.sign(blob, (err, signature) => {
                assert.notExists(err);

                expect(dec.signature).to.be.eql(signature);
                done();
            });
        });
    });

    describe("verifySignature", () => {
        it("valid", (done) => {
            const rec = new Record(Buffer.from("hello"), Buffer.from("world"), id);

            rec.serializeSigned(key, (err, enc) => {
                assert.notExists(err);

                rec.verifySignature(key.public, done);
            });
        });

        it("invalid", (done) => {
            const rec = new Record(Buffer.from("hello"), Buffer.from("world"), id);
            rec.serializeSigned(key, (err, enc) => {
                assert.notExists(err);

                rec.verifySignature(otherKey.public, (err) => {
                    expect(err).to.match(/Invalid record signature/);
                    done();
                });
            });
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
