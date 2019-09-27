const {
    p2p: { PeerId }
} = adone;

const { Message } = require("../src/message");
const {
    signMessage,
    SignPrefix,
    verifySignature
} = require("../src/message/sign");

const { randomSeqno } = require("../src/utils");

describe("message signing", () => {
    let peerId;
    before((done) => {
        peerId = PeerId.create({
            bits: 1024
        }, (err, id) => {
            peerId = id;
            done(err);
        });
    });

    it("should be able to sign and verify a message", (done) => {
        const message = {
            from: peerId.id,
            data: "hello",
            seqno: randomSeqno(),
            topicIDs: ["test-topic"]
        };

        const bytesToSign = Buffer.concat([SignPrefix, Message.encode(message)]);

        peerId.privKey.sign(bytesToSign, (err, expectedSignature) => {
            if (err) {
                return done(err);
            }

            signMessage(peerId, message, (err, signedMessage) => {
                if (err) {
                    return done(err);
                }

                // Check the signature and public key
                expect(signedMessage.signature).to.eql(expectedSignature);
                expect(signedMessage.key).to.eql(peerId.pubKey.bytes);

                // Verify the signature
                verifySignature(signedMessage, (err, verified) => {
                    expect(err).to.not.exist();
                    expect(verified).to.eql(true);
                    done(err);
                });
            });
        });
    });

    it("should be able to extract the public key from an inlined key", (done) => {
        const testSecp256k1 = (peerId) => {
            const message = {
                from: peerId.id,
                data: "hello",
                seqno: randomSeqno(),
                topicIDs: ["test-topic"]
            };

            const bytesToSign = Buffer.concat([SignPrefix, Message.encode(message)]);
            peerId.privKey.sign(bytesToSign, (err, expectedSignature) => {
                if (err) {
                    return done(err);
                }

                signMessage(peerId, message, (err, signedMessage) => {
                    if (err) {
                        return done(err);
                    }

                    // Check the signature and public key
                    expect(signedMessage.signature).to.eql(expectedSignature);
                    signedMessage.key = undefined;

                    // Verify the signature
                    verifySignature(signedMessage, (err, verified) => {
                        expect(err).to.not.exist();
                        expect(verified).to.eql(true);
                        done(err);
                    });
                });
            });
        };

        PeerId.create({ keyType: "secp256k1", bits: 256 }, (err, peerId) => {
            expect(err).to.not.exist();
            testSecp256k1(peerId);
        });
    });

    it("should be able to extract the public key from the message", (done) => {
        const message = {
            from: peerId.id,
            data: "hello",
            seqno: randomSeqno(),
            topicIDs: ["test-topic"]
        };

        const bytesToSign = Buffer.concat([SignPrefix, Message.encode(message)]);

        peerId.privKey.sign(bytesToSign, (err, expectedSignature) => {
            if (err) {
                return done(err);
            }

            signMessage(peerId, message, (err, signedMessage) => {
                if (err) {
                    return done(err);
                }

                // Check the signature and public key
                expect(signedMessage.signature).to.eql(expectedSignature);
                expect(signedMessage.key).to.eql(peerId.pubKey.bytes);

                // Verify the signature
                verifySignature(signedMessage, (err, verified) => {
                    expect(err).to.not.exist();
                    expect(verified).to.eql(true);
                    done(err);
                });
            });
        });
    });
});
