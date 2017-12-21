const util = require("../../utils");

const {
    netron2: { dht, record: { Record } }
} = adone;
const { utils, rpcHandler: { putValue }, Message } = adone.private(dht);

const T = Message.TYPES.PUT_VALUE;

describe("rpc - handlers - PutValue", () => {
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

    it("errors on missing record", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 5);
        putValue(dht)(peers[0], msg, (err, response) => {
            expect(err).to.match(/Empty record/);
            done();
        });
    });

    it("stores the record in the datastore", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 5);
        const record = new Record(
            Buffer.from("hello"),
            Buffer.from("world"),
            peers[0].id
        );
        msg.record = record;

        putValue(dht)(peers[1], msg, (err, response) => {
            assert.notExists(err);
            expect(response).to.be.eql(msg);

            const key = utils.bufferToKey(Buffer.from("hello"));
            dht.datastore.get(key, (err, res) => {
                assert.notExists(err);
                const rec = Record.deserialize(res);

                expect(rec).to.have.property("key").eql(Buffer.from("hello"));

                // make sure some time has passed
                setTimeout(() => {
                    expect(rec.timeReceived < new Date()).to.be.eql(true);
                    done();
                }, 10);
            });
        });
    });
});
