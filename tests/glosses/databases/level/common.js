const each = require("async-each");
const delayed = require("delayed").delayed;

const {
    is,
    database: { level: { DB, backend: { Memory, Encoding } } }
} = adone;

export const openTestDatabase = function () {
    const options = typeof arguments[0] === "object" ? arguments[0] : {};
    const callback = is.function(arguments[0]) ? arguments[0] : arguments[1];

    new DB(new Encoding(new Memory(), options), (err, db) => {
        assert.notExists(err);
        if (!err) {
            this.closeableDatabases.push(db);
            callback(db);
        }
    });
};

export const commonTearDown = function (done) {
    each(this.closeableDatabases, (db, callback) => {
        db.close(callback);
    }, done);
};

export const commonSetUp = function (done) {
    this.closeableDatabases = [];
    this.openTestDatabase = openTestDatabase.bind(this);
    this.timeout = 10000;
    process.nextTick(done);
};

export const readStreamSetUp = function (done) {
    commonSetUp.call(this, () => {
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

        this.verify = delayed(function (rs, done, data) {
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
        }, 0.05, this);

        done();
    });
};
