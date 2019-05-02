const {
    p2p: { record: { Record } }
} = adone;

const srcPath = (...args) => adone.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "kad_dht", ...args);

const Message = require(srcPath("message"));
const handler = require(srcPath("rpc/handlers/put-value"));
const utils = require(srcPath("utils"));

const createPeerInfo = require("../../utils/create_peer_info");
// const createValues = require('../../utils/create-values')
const TestDHT = require("../../utils/test_dht");

const T = Message.TYPES.PUT_VALUE;

describe("rpc - handlers - PutValue", () => {
    let peers;
    let tdht;
    let dht;

    before((done) => {
        createPeerInfo(2, (err, res) => {
            expect(err).to.not.exist();
            peers = res;
            done();
        });
    });

    beforeEach((done) => {
        tdht = new TestDHT();

        tdht.spawn(1, (err, dhts) => {
            expect(err).to.not.exist();
            dht = dhts[0];
            done();
        });
    });

    afterEach((done) => {
        tdht.teardown(done);
    });

    it("errors on missing record", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 5);
        handler(dht)(peers[0], msg, (err) => {
            expect(err.code).to.eql("ERR_EMPTY_RECORD");
            done();
        });
    });

    it("stores the record in the datastore", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 5);
        const record = new Record(
            Buffer.from("hello"),
            Buffer.from("world")
        );
        msg.record = record;

        handler(dht)(peers[1], msg, (err, response) => {
            expect(err).to.not.exist();
            expect(response).to.be.eql(msg);

            const key = utils.bufferToKey(Buffer.from("hello"));
            dht.datastore.get(key, (err, res) => {
                expect(err).to.not.exist();
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
