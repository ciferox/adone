const util = require("../../utils");

const {
    netron2: { dht }
} = adone;
const { rpcHandler: { ping }, Message } = adone.private(dht);

const T = Message.TYPES.PING;

describe("rpc - handlers - Ping", () => {
    let peers;
    let dht;

    before((done) => {
        util.makePeers(2, (err, res) => {
            assert.notExists(err);
            peers = res;
            done();
        });
    });

    afterEach((done) => util.teardown(done));

    beforeEach((done) => {
        util.setupDHT((err, res) => {
            assert.notExists(err);
            dht = res;
            done();
        });
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
