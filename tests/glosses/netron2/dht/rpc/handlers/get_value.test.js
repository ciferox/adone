const waterfall = require("async/waterfall");
import { makePeers, teardown, setupDHT } from "../../utils";

const {
    netron2: { dht }
} = adone;
const { utils, rpcHandler: { getValue }, Message } = adone.private(dht);

const T = Message.TYPES.GET_VALUE;

describe("netron2", "dht", "KadDHT", "rpc - handlers - GetValue", () => {
    let peers;
    let dht;

    before(() => {
        peers = makePeers(2);
    });

    afterEach(() => teardown());

    beforeEach(async () => {
        dht = await setupDHT();
    });

    it("errors when missing key", (done) => {
        const msg = new Message(T, Buffer.alloc(0), 0);

        getValue(dht)(peers[0], msg, (err, response) => {
            expect(err).to.match(/Invalid key/);
            assert.notExists(response);
            done();
        });
    });

    it("responds with a local value", (done) => {
        const key = Buffer.from("hello");
        const value = Buffer.from("world");
        const msg = new Message(T, key, 0);

        waterfall([
            (cb) => dht.put(key, value, cb),
            (cb) => getValue(dht)(peers[0], msg, cb)
        ], (err, response) => {
            assert.notExists(err);
            assert.exists(response.record);
            expect(response.record.key).to.eql(key);
            expect(response.record.value).to.eql(value);
            done();
        });
    });

    it("responds with closerPeers returned from the dht", (done) => {
        const key = Buffer.from("hello");
        const msg = new Message(T, key, 0);
        const other = peers[1];

        dht._add(other);
        waterfall([
            (cb) => getValue(dht)(peers[0], msg, cb)
        ], (err, response) => {
            assert.notExists(err);
            expect(response.closerPeers).to.have.length(1);
            expect(
                response.closerPeers[0].id.asBase58()
            ).to.be.eql(other.id.asBase58());
            done();
        });
    });

    describe("public key", () => {
        it("self", (done) => {
            const key = utils.keyForPublicKey(dht.peerInfo.id);

            const msg = new Message(T, key, 0);

            waterfall([
                (cb) => getValue(dht)(peers[0], msg, cb)
            ], (err, response) => {
                assert.notExists(err);
                assert.exists(response.record);
                expect(response.record.value).to.eql(
                    dht.peerInfo.id.pubKey.bytes
                );
                done();
            });
        });

        it("other in peerstore", (done) => {
            const other = peers[1];
            const key = utils.keyForPublicKey(other.id);

            const msg = new Message(T, key, 0);

            dht._add(other);
            waterfall([
                (cb) => getValue(dht)(peers[0], msg, cb)
            ], (err, response) => {
                assert.notExists(err);
                assert.exists(response.record);
                expect(response.record.value).to.eql(
                    other.id.pubKey.bytes
                );
                done();
            });
        });

        it("other unkown", (done) => {
            const other = peers[1];
            const key = utils.keyForPublicKey(other.id);

            const msg = new Message(T, key, 0);

            waterfall([
                (cb) => getValue(dht)(peers[0], msg, cb)
            ], (err, response) => {
                assert.notExists(err);
                assert.notExists(response.record);

                done();
            });
        });
    });
});
