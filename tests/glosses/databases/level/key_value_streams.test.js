import Manager from "./common";
const delayed = require("delayed").delayed;

describe("Key and Value Streams", () => {
    let manager;
    let dataSpy;
    let endSpy;
    let sourceData;
    let sourceKeys;
    let sourceValues;
    let verify;

    beforeEach(async () => {
        manager = new Manager();
        await manager.setUp();
        dataSpy = spy();
        endSpy = spy();
        sourceData = [];

        for (let i = 0; i < 100; i++) {
            const k = (i < 10 ? "0" : "") + i;
            sourceData.push({
                type: "put",
                key: k,
                value: Math.random()
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
    });

    afterEach(() => {
        return manager.shutdown();
    });

    it("test .keyStream()", async (done) => {
        const db = await manager.openTestDatabase();
        await db.batch(sourceData.slice());
        const rs = db.createKeyStream();
        rs.on("data", dataSpy);
        rs.on("end", endSpy);
        rs.on("close", () => verify(rs, sourceKeys, done));
    });

    it("test .readStream({keys:true,values:false})", async (done) => {
        const db = await manager.openTestDatabase();
        await db.batch(sourceData.slice());
        const rs = db.createReadStream({ keys: true, values: false });
        rs.on("data", dataSpy);
        rs.on("end", endSpy);
        rs.on("close", () => verify(rs, sourceKeys, done));
    });

    it("test .valueStream()", async (done) => {
        const db = await manager.openTestDatabase();
        await db.batch(sourceData.slice());
        const rs = db.createValueStream();
        rs.on("data", dataSpy);
        rs.on("end", endSpy);
        rs.on("close", () => verify(rs, sourceValues, done));
    });

    it("test .readStream({keys:false,values:true})", async (done) => {
        const db = await manager.openTestDatabase();
        await db.batch(sourceData.slice());
        const rs = db.createReadStream({ keys: false, values: true });
        rs.on("data", dataSpy);
        rs.on("end", endSpy);
        rs.on("close", () => verify(rs, sourceValues, done));
    });
});
