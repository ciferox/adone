const waterfall = require("async/waterfall");
const util = require("../../utils");

const {
    netron2: { dht }
} = adone;
const { utils, rpcHandler: { getProviders }, Message } = adone.private(dht);

const T = Message.TYPES.GET_PROVIDERS;

describe("rpc - handlers - GetProviders", () => {
    let peers;
    let values;
    let dht;

    before(() => {
        peers = util.makePeers(3);
        values = util.makeValues(2);
    });

    afterEach((done) => util.teardown(done));

    beforeEach((done) => {
        util.setupDHT((err, res) => {
            assert.notExists(err);
            dht = res;
            done();
        });
    });

    it("errors with an invalid key ", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 0);

        getProviders(dht)(peers[0], msg, (err, response) => {
            expect(err).to.match(/Invalid CID/);
            assert.notExists(response);
            done();
        });
    });

    it("responds with self if the value is in the datastore", (done) => {
        const v = values[0];

        const msg = new Message(T, v.cid.buffer, 0);
        const dsKey = utils.bufferToKey(v.cid.buffer);

        waterfall([
            (cb) => dht.datastore.put(dsKey, v.value, cb),
            (cb) => getProviders(dht)(peers[0], msg, cb)
        ], (err, response) => {
            assert.notExists(err);

            expect(response.key).to.be.eql(v.cid.buffer);
            expect(response.providerPeers).to.have.length(1);
            expect(response.providerPeers[0].id.asBase58())
                .to.eql(dht.peerInfo.id.asBase58());

            done();
        });
    });

    it("responds with listed providers and closer peers", (done) => {
        const v = values[0];

        const msg = new Message(T, v.cid.buffer, 0);
        const prov = peers[1].id;
        const closer = peers[2];

        dht._add(closer);
        waterfall([
            (cb) => dht.providers.addProvider(v.cid, prov, cb),
            (cb) => getProviders(dht)(peers[0], msg, cb)
        ], (err, response) => {
            assert.notExists(err);

            expect(response.key).to.be.eql(v.cid.buffer);
            expect(response.providerPeers).to.have.length(1);
            expect(response.providerPeers[0].id.asBase58())
                .to.eql(prov.asBase58());

            expect(response.closerPeers).to.have.length(1);
            expect(response.closerPeers[0].id.asBase58())
                .to.eql(closer.id.asBase58());
            done();
        });
    });
});
