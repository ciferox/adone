const delayed = require("delayed").delayed;
const { DB } = adone.database.level;

let dbidx = 0;

export default class Manager {
    constructor() {
        this.binaryTestDataMD5Sum = "920725ef1a3b32af40ccd0b78f4a62fd";
    }

    nextLocation() {
        return adone.std.path.join(__dirname, `_levelup_test_db_${dbidx++}`);
    }

    async openTestDatabase(location = null, options = { createIfMissing: true, errorIfExists: true }) {
        if (location === null) {
            location = this.nextLocation();
        }
        await adone.fs.rm(location);
        this.cleanupDirs.push(location);
        const db = new DB(location, options);
        await db.open();
        this.closeableDatabases.push(db);
        return db;
    }

    setUp() {
        this.cleanupDirs = [];
        this.closeableDatabases = [];
        this.timeout = 10000;
        return this.cleanup();
    }

    async streamSetUp() {
        await this.setUp();
        let i;
        let k;

        this.dataSpy = spy();
        this.endSpy = spy();
        this.sourceData = [];

        for (i = 0; i < 100; i++) {
            k = (i < 10 ? "0" : "") + i;
            this.sourceData.push({
                type: "put",
                key: k,
                value: Math.random()
            });
        }

        this.verify = delayed((done, data) => {
            if (!data) {
                data = this.sourceData;
            } // can pass alternative data array for verification
            assert.equal(this.endSpy.callCount, 1, 'ReadStream emitted single "end" event');
            assert.equal(this.dataSpy.callCount, data.length, 'ReadStream emitted correct number of "data" events');
            data.forEach((d, i) => {
                const call = this.dataSpy.getCall(i);
                if (call) {
                    assert.equal(call.args.length, 1, `ReadStream "data" event #${i} fired with 1 argument`);
                    assert.isNotNull(call.args[0].key, `ReadStream "data" event #${i} argument has "key" property`);
                    assert.isNotNull(call.args[0].value, `ReadStream "data" event #${i} argument has "value" property`);
                    assert.equal(call.args[0].key, d.key, `ReadStream "data" event #${i} argument has correct "key"`);
                    assert.deepEqual(Number(call.args[0].value), Number(d.value), `ReadStream "data" event #${i} argument has correct "value"`);
                }
            });
            done();
        }, 0.05);
    }

    async shutdown() {
        for (const db of this.closeableDatabases) {
            await db.close();
        }
        return this.cleanup();
    }

    loadBinaryTestData() {
        return adone.fs.readFile(adone.std.path.join(__dirname, "data/testdata.bin"));
    }

    checkBinaryTestData(testData) {
        const md5sum = adone.std.crypto.createHash("md5");
        md5sum.update(testData);
        assert.equal(md5sum.digest("hex"), this.binaryTestDataMD5Sum);
    }

    async cleanup() {
        const list = (await adone.fs.readdir(__dirname)).filter((f) => {
            return (/^_levelup_test_db_/).test(f);
        });
        for (const f of list) {
            await adone.fs.rm(adone.std.path.join(__dirname, f));
        }
    }

    static async shouldThrows(fn, Type, msg, fail = `Should throws ${Type.name}`) {
        try {
            await fn();
        } catch (err) {
            assert.instanceOf(err, Type);
            if (adone.is.string(msg)) {
                assert.equal(err.message, msg);
            }
            return;
        }
        assert.fail(fail);
    }

    static async open(location, options) {
        const db = new DB(location, options);
        assert(!db.isOpen());
        assert(!db.isClosed());
        await db.open();
        return db;
    }
}
