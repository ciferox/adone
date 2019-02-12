const common = require("./common");
const delayed = require("delayed").delayed;

describe("Key and Value Streams", () => {
    beforeEach((done) => {
        common.commonSetUp(() => {
            common.dataSpy = spy();
            common.endSpy = spy();
            common.sourceData = [];

            for (let i = 0; i < 100; i++) {
                const k = (i < 10 ? "0" : "") + i;
                common.sourceData.push({
                    type: "put",
                    key: k,
                    value: Math.random()
                });
            }

            common.sourceKeys = Object.keys(common.sourceData).map((k) => common.sourceData[k].key);
            common.sourceValues = Object.keys(common.sourceData).map((k) => common.sourceData[k].value);

            common.verify = delayed((rs, data, done) => {
                assert.equal(common.endSpy.callCount, 1, 'Stream emitted single "end" event');
                assert.equal(common.dataSpy.callCount, data.length, 'Stream emitted correct number of "data" events');
                data.forEach((d, i) => {
                    const call = common.dataSpy.getCall(i);
                    if (call) {
                        // console.log('call', i, ':', call.args[0].key, '=', call.args[0].value, '(expected', d.key, '=', d.value, ')')
                        assert.equal(call.args.length, 1, `Stream "data" event #${i} fired with 1 argument`);
                        assert.equal(Number(call.args[0].toString()), Number(d), `Stream correct "data" event #${i}: ${d}`);
                    }
                });
                done();
            }, 0.05, common);

            done();
        });
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("test .createKeyStream()", (done) => {
        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createKeyStream();
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, common.sourceKeys, done));
            });
        });
    });

    it("test .createReadStream({keys:true,values:false})", (done) => {
        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ keys: true, values: false });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, common.sourceKeys, done));
            });
        });
    });

    it("test .createValueStream()", (done) => {
        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createValueStream();
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, common.sourceValues, done));
            });
        });
    });

    it("test .createReadStream({keys:false,values:true})", (done) => {
        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ keys: false, values: true });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, common.sourceValues, done));
            });
        });
    });
});
