const common = require("./common");
const refute = require("referee").refute;
const delayed = require("delayed").delayed;

describe("Key and Value Streams", () => {
    let ctx;
    let dataSpy;
    let endSpy;
    let sourceData;
    let sourceKeys;
    let sourceValues;
    let verify;

    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, () => {
            dataSpy = spy();
            endSpy = spy();
            sourceData = [];

            for (let i = 0; i < 100; i++) {
                const k = (i < 10 ? "0" : "") + i;
                sourceData.push({
                    type: "put"
                    , key: k
                    , value: Math.random()
                });
            }

            sourceKeys = Object.keys(sourceData).map((k) => {
                return sourceData[k].key;
            });
            sourceValues = Object.keys(sourceData).map((k) => {
                return sourceData[k].value;
            });

            verify = delayed((data, done) => {
                assert.equal(endSpy.callCount, 1, 'Stream emitted single "end" event');
                assert.equal(dataSpy.callCount, data.length, 'Stream emitted correct number of "data" events');
                data.forEach((d, i) => {
                    const call = dataSpy.getCall(i);
                    if (call) {
                        //console.log('call', i, ':', call.args[0].key, '=', call.args[0].value, '(expected', d.key, '=', d.value, ')')
                        assert.equal(call.args.length, 1, `Stream "data" event #${i} fired with 1 argument`);
                        assert.equal(Number(call.args[0].toString()), Number(d), `Stream correct "data" event #${i}: ${d}`);
                    }
                });
                done();
            }, 0.05);

            done();
        });
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("test .keyStream()", (done) => {
        ctx.openTestDatabase((db) => {
            // execute
            db.batch(sourceData.slice(), (err) => {
                refute(err);

                const rs = db.keyStream();
                rs.on("data", dataSpy);
                rs.on("end", endSpy);
                rs.on("close", verify.bind(null, rs, sourceKeys, done));
            });
        });
    });

    it("test .readStream({keys:true,values:false})", (done) => {
        ctx.openTestDatabase((db) => {
            // execute
            db.batch(sourceData.slice(), (err) => {
                refute(err);

                const rs = db.readStream({ keys: true, values: false });
                rs.on("data", dataSpy);
                rs.on("end", endSpy);
                rs.on("close", verify.bind(null, rs, sourceKeys, done));
            });
        });
    });

    it("test .valueStream()", (done) => {
        ctx.openTestDatabase((db) => {
            // execute
            db.batch(sourceData.slice(), (err) => {
                refute(err);

                const rs = db.valueStream();
                rs.on("data", dataSpy);
                rs.on("end", endSpy);
                rs.on("close", verify.bind(null, rs, sourceValues, done));
            });
        });
    });

    it("test .readStream({keys:false,values:true})", (done) => {
        ctx.openTestDatabase((db) => {
            // execute
            db.batch(sourceData.slice(), (err) => {
                refute(err);

                const rs = db.readStream({ keys: false, values: true });
                rs.on("data", dataSpy);
                rs.on("end", endSpy);
                rs.on("close", verify.bind(null, rs, sourceValues, done));
            });
        });
    });
});
