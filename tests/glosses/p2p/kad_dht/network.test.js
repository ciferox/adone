const series = require("async/series");

const {
    p2p: { KadDHT, TCP, Switch, PeerBook, Connection, multiplex },
    stream: { pull2: pull }
} = adone;
const { lengthPrefixed: lp } = pull;

const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "kad_dht", ...args);

const Message = require(srcPath("message"));

const createPeerInfo = require("./utils/create_peer_info");

describe("Network", () => {
    let dht;
    let peerInfos;

    before(function (done) {
        this.timeout(10 * 1000);
        createPeerInfo(3, (err, result) => {
            if (err) {
                return done(err);
            }

            peerInfos = result;
            const sw = new Switch(peerInfos[0], new PeerBook());
            sw.transport.add("tcp", new TCP());
            sw.connection.addStreamMuxer(multiplex);
            sw.connection.reuse();
            dht = new KadDHT(sw);

            series([
                (cb) => sw.start(cb),
                (cb) => dht.start(cb)
            ], done);
        });
    });

    after(function (done) {
        this.timeout(10 * 1000);
        series([
            (cb) => dht.stop(cb),
            (cb) => dht.switch.stop(cb)
        ], done);
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
            dht.switch.dial = (peer, protocol, callback) => {
                expect(protocol).to.eql("/ipfs/kad/1.0.0");
                const msg = new Message(Message.TYPES.FIND_NODE, Buffer.from("world"), 0);

                const rawConn = {
                    source: pull(
                        pull.values([msg.serialize()]),
                        lp.encode()
                    ),
                    sink: pull(
                        lp.decode(),
                        pull.collect((err, res) => {
                            expect(err).to.not.exist();
                            expect(Message.deserialize(res[0]).type).to.eql(Message.TYPES.PING);
                            finish();
                        })
                    )
                };
                const conn = new Connection(rawConn);
                callback(null, conn);
            };

            dht.network.sendRequest(peerInfos[0].id, msg, (err, response) => {
                expect(err).to.not.exist();
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
            dht.switch.dial = (peer, protocol, callback) => {
                expect(protocol).to.eql("/ipfs/kad/1.0.0");
                const rawConn = {
                    // hanging
                    source: (end, cb) => { },
                    sink: pull(
                        lp.decode(),
                        pull.collect((err, res) => {
                            expect(err).to.not.exist();
                            expect(Message.deserialize(res[0]).type).to.eql(Message.TYPES.PING);
                            finish();
                        })
                    )
                };
                const conn = new Connection(rawConn);
                callback(null, conn);
            };

            dht.network.readMessageTimeout = 100;

            dht.network.sendRequest(peerInfos[0].id, msg, (err, response) => {
                expect(err).to.exist();
                expect(err.message).to.match(/timed out/);

                finish();
            });
        });
    });
});
