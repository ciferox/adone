const start = require("./common");
const storeShard = adone.odm.plugins[2][0].storeShard;

const mongoose = start.mongoose;

describe("sharding", () => {
    it("should handle shard keys properly (gh-2127)", (done) => {
        const mockSchema = {
            options: {
                shardKey: { date: 1 }
            }
        };
        const Stub = function () {
            this.schema = mockSchema;
            this.$__ = {};
        };
        Stub.prototype.__proto__ = mongoose.Document.prototype;
        const d = new Stub();
        const currentTime = new Date();
        d._doc = { date: currentTime };

        storeShard.call(d);
        assert.equal(d.$__.shardval.date, currentTime);
        done();
    });
});

describe("toObject()", () => {
    let Stub;

    beforeEach(() => {
        Stub = function () {
            const schema = this.schema = {
                options: { toObject: { minimize: false, virtuals: true } },
                virtuals: { virtual: "test" }
            };
            this._doc = { empty: {} };
            this.get = function (path) {
                return schema.virtuals[path]; 
            };
            this.$__ = {};
        };
        Stub.prototype = Object.create(mongoose.Document.prototype);
    });

    it("should inherit options from schema", (done) => {
        const d = new Stub();
        assert.deepEqual(d.toObject(), { empty: {}, virtual: "test" });
        done();
    });

    it("can overwrite by passing an option", (done) => {
        const d = new Stub();
        assert.deepEqual(d.toObject({ minimize: true }), {});
        done();
    });

    it("doesnt crash with empty object (gh-3130)", (done) => {
        const d = new Stub();
        d._doc = undefined;
        assert.doesNotThrow(() => {
            d.toObject();
        });
        done();
    });
});
