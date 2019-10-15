/**
 * This test suite is intended to validate compatability of
 * the promisified api, until libp2p has been fully migrated to
 * async/await. Once the migration is complete and all tests
 * are using async/await, this file can be removed.
 */

const promisify = require("promisify-es6");
const createNode = promisify(require("./utils/create-node"));
const { createPeerInfo } = require("./utils/create-node");
const Node = require("./utils/bundle");
const pull = require("pull-stream");
const Ping = require(adone.getPath("src/glosses/netron/ipc/ping"));

/**
 * As libp2p is currently promisified, when extending libp2p,
 * method arguments must be passed to `super` to ensure the
 * promisify callbacks are properly resolved
 */
class AsyncLibp2p extends Node {
    async start(...args) {
        await super.start(...args);
    }

    async stop(...args) {
        await super.start(...args);
    }
}

async function createAsyncNode() {
    const peerInfo = await promisify(createPeerInfo)();
    peerInfo.multiaddrs.add("/ip4/0.0.0.0/tcp/0");
    return new AsyncLibp2p({ peerInfo });
}

describe("promisified", () => {
    let libp2p;
    let otherNode;
    const ECHO_PROTO = "/echo/1.0.0";

    before(async () => {
        [libp2p, otherNode] = await Promise.all([
            createNode("/ip4/0.0.0.0/tcp/0"),
            createAsyncNode()
        ]);

        return Promise.all([libp2p, otherNode].map((node) => {
            node.handle(ECHO_PROTO, (_, conn) => pull(conn, conn));
            return node.start();
        }));
    });

    after("Stop", () => {
        return [libp2p, otherNode].map((node) => node.stop());
    });

    afterEach("Hang up", () => {
        return libp2p.hangUp(otherNode.peerInfo);
    });

    it("dial", async () => {
        const stream = await libp2p.dial(otherNode.peerInfo);
        expect(stream).to.not.exist();
        expect(libp2p._switch.connection.getAll()).to.have.length(1);
    });

    it("dialFSM", async () => {
        const connectionFSM = await libp2p.dialFSM(otherNode.peerInfo, ECHO_PROTO);
        expect(connectionFSM).to.exist();
    });

    it("dialProtocol", async () => {
        const stream = await libp2p.dialProtocol(otherNode.peerInfo, ECHO_PROTO);
        expect(stream).to.exist();
    });

    it.todo("ping", async () => {
        const ping = await libp2p.ping(otherNode.peerInfo);
        expect(ping).to.be.an.instanceOf(Ping);
    });
});
