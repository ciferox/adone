const pull = require("pull-stream");
const lp = require("pull-length-prefixed");

const {
    p2p: { KadDHT, Connection, PeerBook, Switch, TCP, multiplex }
} = adone;

const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "kad_dht", ...args);

const Message = require(srcPath("message"));
const rpc = require(srcPath("rpc"));

const createPeerInfo = require("../utils/create_peer_info");

describe("rpc", () => {
    let peerInfos;

    before((done) => {
        createPeerInfo(2, (err, peers) => {
            if (err) {
                return done(err);
            }

            peerInfos = peers;
            done();
        });
    });

    describe("protocolHandler", () => {
        it("calls back with the response", (done) => {
            const sw = new Switch(peerInfos[0], new PeerBook());
            sw.transport.add("tcp", new TCP());
            sw.connection.addStreamMuxer(multiplex);
            sw.connection.reuse();
            const dht = new KadDHT(sw, { kBucketSize: 5 });

            dht.peerBook.put(peerInfos[1]);

            const msg = new Message(Message.TYPES.GET_VALUE, Buffer.from("hello"), 5);

            const conn = makeConnection(msg, peerInfos[1], (err, res) => {
                expect(err).to.not.exist();
                expect(res).to.have.length(1);
                const msg = Message.deserialize(res[0]);
                expect(msg).to.have.property("key").eql(Buffer.from("hello"));
                expect(msg).to.have.property("closerPeers").eql([]);

                done();
            });

            rpc(dht)("protocol", conn);
        });
    });
});

function makeConnection(msg, info, callback) {
    const rawConn = {
        source: pull(
            pull.values([msg.serialize()]),
            lp.encode()
        ),
        sink: pull(
            lp.decode(),
            pull.collect(callback)
        )
    };
    const conn = new Connection(rawConn);
    conn.setPeerInfo(info);
    return conn;
}
