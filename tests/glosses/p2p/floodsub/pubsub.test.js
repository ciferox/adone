const {
    p2p: { FloodSub, PubsubBaseProtocol: { utils } }
} = adone;

const sinon = require("sinon");
const { createNode } = require("./utils");

describe("pubsub", () => {
    let floodsub;
    let libp2p;

    before((done) => {
        createNode((err, node) => {
            expect(err).to.not.exist();
            libp2p = node;
            floodsub = new FloodSub(libp2p);
            done(err);
        });
    });

    beforeEach((done) => {
        floodsub.start(done);
    });

    afterEach((done) => {
        sinon.restore();
        floodsub.stop(done);
    });

    describe("publish", () => {
        it("should emit non normalized messages", (done) => {
            sinon.spy(floodsub, "_emitMessages");
            sinon.spy(utils, "randomSeqno");

            const topic = "my-topic";
            const message = Buffer.from("a neat message");

            floodsub.publish(topic, message, (err) => {
                expect(err).to.not.exist();
                expect(floodsub._emitMessages.callCount).to.eql(1);

                const [topics, messages] = floodsub._emitMessages.getCall(0).args;
                expect(topics).to.eql([topic]);
                expect(messages).to.eql([{
                    from: libp2p.peerInfo.id.toB58String(),
                    data: message,
                    seqno: utils.randomSeqno.getCall(0).returnValue,
                    topicIDs: topics
                }]);
                done();
            });
        });

        it("should forward normalized messages", (done) => {
            sinon.spy(floodsub, "_forwardMessages");
            sinon.spy(utils, "randomSeqno");

            const topic = "my-topic";
            const message = Buffer.from("a neat message");

            floodsub.publish(topic, message, (err) => {
                expect(err).to.not.exist();
                expect(floodsub._forwardMessages.callCount).to.eql(1);
                const [topics, messages] = floodsub._forwardMessages.getCall(0).args;

                floodsub._buildMessage({
                    from: libp2p.peerInfo.id.toB58String(),
                    data: message,
                    seqno: utils.randomSeqno.getCall(0).returnValue,
                    topicIDs: topics
                }, (err, expected) => {
                    expect(err).to.not.exist();

                    expect(topics).to.eql([topic]);
                    expect(messages).to.eql([
                        expected
                    ]);
                    done();
                });
            });
        });
    });
});
