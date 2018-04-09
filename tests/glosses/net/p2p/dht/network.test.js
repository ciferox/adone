import createPeerInfo from "./utils/create_peer_info";

const {
    net: { p2p: { muxer: { mplex }, dht, switch: { Switch }, PeerBook, Connection, transport: { TCP } } },
    stream: { pull }
} = adone;
const { KadDHT } = dht;
const { Message } = adone.private(dht);

describe("dht", "KadDHT", "Network", () => {
    let dht;
    let peerInfos;

    before(async function () {
        this.timeout(10 * 1000);
        peerInfos = createPeerInfo(3);
        const sw = new Switch(peerInfos[0], new PeerBook());
        sw.tm.add("tcp", new TCP());
        sw.connection.addStreamMuxer(mplex);
        sw.connection.reuse();
        dht = new KadDHT(sw);

        await sw.start();
        await new Promise((resolve) => dht.start(resolve));
    });

    after(async function () {
        this.timeout(10 * 1000);

        await new Promise((resolve) => dht.stop(resolve));
        await dht.switch.stop();
    });

    describe("sendRequest", () => {
        it("send and response", (done) => {
            let i = 0;
            const finish = () => {
                if (i++ === 1) {
                    done();
                }
            };

            const msg = new Message(Message.TYPES.PING, Buffer.from("hello"), 0);

            // mock it
            dht.switch.connect = (peer, protocol) => {
                expect(protocol).to.eql("/ipfs/kad/1.0.0");
                const msg = new Message(Message.TYPES.FIND_NODE, Buffer.from("world"), 0);

                const rawConn = {
                    source: pull(
                        pull.values([msg.serialize()]),
                        pull.lengthPrefixed.encode()
                    ),
                    sink: pull(
                        pull.lengthPrefixed.decode(),
                        pull.collect((err, res) => {
                            assert.notExists(err);
                            expect(Message.deserialize(res[0]).type).to.eql(Message.TYPES.PING);
                            finish();
                        })
                    )
                };
                return Promise.resolve(new Connection(rawConn));
            };

            dht.network.sendRequest(peerInfos[0].id, msg, (err, response) => {
                assert.notExists(err);
                expect(response.type).to.eql(Message.TYPES.FIND_NODE);

                finish();
            });
        });

        it("timeout on no message", (done) => {
            let i = 0;
            const finish = () => {
                if (i++ === 1) {
                    done();
                }
            };

            const msg = new Message(Message.TYPES.PING, Buffer.from("hello"), 0);

            // mock it
            dht.switch.connect = (peer, protocol) => {
                expect(protocol).to.eql("/ipfs/kad/1.0.0");
                const rawConn = {
                    // hanging
                    source: (end, cb) => { },
                    sink: pull(
                        pull.lengthPrefixed.decode(),
                        pull.collect((err, res) => {
                            assert.notExists(err);
                            expect(Message.deserialize(res[0]).type).to.eql(Message.TYPES.PING);
                            finish();
                        })
                    )
                };
                return Promise.resolve(new Connection(rawConn));
            };

            dht.network.readMessageTimeout = 100;

            dht.network.sendRequest(peerInfos[0].id, msg, (err, response) => {
                assert.exists(err);
                expect(err.message).to.match(/timed out/);

                finish();
            });
        });
    });
});
