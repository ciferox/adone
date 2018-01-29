import { makePeers, teardown, setupDHT } from "../../utils";

const {
    net: { p2p: { dht } }
} = adone;
const { rpcHandler: { ping }, Message } = adone.private(dht);

const T = Message.TYPES.PING;

describe("dht", "KadDHT", "rpc - handlers - Ping", () => {
    let peers;
    let dht;

    before(() => {
        peers = makePeers(2);
    });

    afterEach(() => teardown());

    beforeEach(async () => {
        dht = await setupDHT();
    });

    it("replies with the same message", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 5);

        ping(dht)(peers[0], msg, (err, response) => {
            assert.notExists(err);
            expect(response).to.be.eql(msg);
            done();
        });
    });
});
