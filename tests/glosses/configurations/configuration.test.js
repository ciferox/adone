const { is } = adone;

describe("configuration", "Configuration", () => {
    let conf;
    let proto;

    beforeEach(() => {
        conf = new adone.configuration.Configuration();
        proto = conf.__proto__;
    });

    it("should have map-like interface", () => {
        assert.isTrue(is.propertyOwned(proto, "set"));
        assert.isTrue(is.propertyOwned(proto, "get"));
        assert.isTrue(is.propertyOwned(proto, "has"));
        assert.isTrue(is.propertyOwned(proto, "delete"));
        assert.isTrue(is.propertyOwned(proto, "keys"));
        assert.isTrue(is.propertyOwned(proto, "values"));
        assert.isTrue(is.propertyOwned(proto, "entries"));
    });

    it("should get undefined of nonexisting key", () => {
        assert.isUndefined(conf.get("nonexists"));
    });

    it("should correctly check key", () => {
        assert.throws(() => (conf.get(1)), adone.x.InvalidArgument);
        assert.throws(() => (conf.get({})), adone.x.InvalidArgument);
        assert.throws(() => (conf.get(true)), adone.x.InvalidArgument);
        assert.throws(() => (conf.get("")), adone.x.InvalidArgument);
        assert.throws(() => (conf.get([""])), adone.x.InvalidArgument);
    });

    it("should set value be accesisble directly", () => {
        conf.set("a", 10);
        assert.equal(conf.a, 10);
    });

    it("should set value of complex key", () => {
        conf.set("a.b", 10);
        assert.equal(conf.a.b, 10);
        conf.set("a.c.d", 20);
        assert.equal(conf.a.c.d, 20);
        conf.set("a.d.e.f.g", 30);
        assert.equal(conf.a.d.e.f.g, 30);
    });

    it("should reassign value of non-plain object", () => {
        conf.set("a.b", 10);
        assert.equal(conf.a.b, 10);
        conf.set("a.b.d", 20);
        assert.equal(conf.a.b.d, 20);
    });

    it("should reassign value of middle subkey", () => {
        conf.set("a.b.c", 10);
        assert.equal(conf.a.b.c, 10);
        conf.set("a.b", 20);
        assert.equal(conf.a.b, 20);
    });

    it("should has() correcly check existence of key", () => {
        conf.set("a.b.c", 10);
        assert.isTrue(conf.has("a"));
        assert.isTrue(conf.has("a.b"));
        assert.isTrue(conf.has("a.b.c"));
        assert.isFalse(conf.has("a.b.c.d"));

        class A {
            constructor() {
                this.val = 1;
            }
        }

        conf.set("a.b.a", new A());
        assert.isTrue(conf.has("a.b.a"));
        assert.isTrue(conf.has("a.b.a.val"));
        assert.isFalse(conf.has("a.b.a.other"));
    });

    it("should get() value of existence key", () => {
        conf.set("a.b.c", 10);
        assert.isTrue(is.plainObject(conf.get("a")));
        assert.isTrue(is.plainObject(conf.get("a.b")));
        assert.equal(conf.get("a.b.c"), 10);
        assert.isUndefined(conf.get("a.b.c.d"));

        class A {
            constructor() {
                this.val = 1;
            }
        }

        const a = new A();
        conf.set("a.b.a", a);
        assert.deepEqual(conf.get("a.b.a"), a);
        assert.equal(conf.get("a.b.a.val"), 1);
        assert.isUndefined(conf.get("a.b.a.other"));
    });

    it("shouldn't get access to value reserved property '_' and nested properties", () => {
        assert.throws(() => (conf.has("_")), TypeError);
        assert.throws(() => (conf.has("_.size")), TypeError);
        assert.throws(() => (conf.get("_")), TypeError);
        assert.throws(() => (conf.get("_.size")), TypeError);
        assert.throws(() => (conf.set("_", 10)), TypeError);
        assert.throws(() => (conf.set("_.size")), TypeError);
        assert.throws(() => (conf.delete("_", 10)), TypeError);
        assert.throws(() => (conf.delete("_.size")), TypeError);
    });

    it("should delete keys", () => {
        conf.set("a.b.c", 10);
        conf.delete("a.b.c");
        assert.isTrue(conf.has("a.b"));
        assert.isFalse(conf.has("a.b.c"));
        conf.delete("a");
        assert.isFalse(conf.has("a"));
        assert.isFalse(conf.has("a.b"));
    });

    it("initially keys() should return empty array", () => {
        assert.deepEqual(conf.keys(), []);
    });

    it("assign()", () => {
        conf.assign({
            a: 1,
            b: 2,
            c: 3
        });
        assert.equal(conf.a, 1);
        assert.equal(conf.b, 2);
        assert.equal(conf.c, 3);
    });

    it("assign() multi", () => {
        conf.assign({
            a: 1,
            b: 2,
            c: 3
        }, {
            c: 4,
            d: 5
        }, {
            e: 6
        });
        assert.equal(conf.a, 1);
        assert.equal(conf.b, 2);
        assert.equal(conf.c, 4);
        assert.equal(conf.d, 5);
        assert.equal(conf.e, 6);
    });

    it("assign() other configuration", () => {
        const otherConf = new adone.configuration.Configuration();
        otherConf.assign({
            c: 4,
            d: 5
        }, {
            e: 6
        });
        conf.assign({
            a: 1,
            b: 2,
            c: 3
        }, otherConf);
        assert.equal(conf.a, 1);
        assert.equal(conf.b, 2);
        assert.equal(conf.c, 4);
        assert.equal(conf.d, 5);
        assert.equal(conf.e, 6);
    });

    it("assign() to non existing key", () => {
        conf.assign("adone", {
            a: 1,
            b: 2,
            c: 3
        });
        assert.equal(conf.adone.a, 1);
        assert.equal(conf.adone.b, 2);
        assert.equal(conf.adone.c, 3);
    });

    it("keys()", () => {
        conf.set("a", 1);
        conf.set("b", 2);
        conf.set("c", 3);
        const keys = conf.keys();
        assert.equal(keys.length, 3);
        assert.isTrue(keys.includes("a"));
        assert.isTrue(keys.includes("b"));
        assert.isTrue(keys.includes("c"));
    });

    it("values()", () => {
        conf.set("a", 1);
        conf.set("b", 2);
        conf.set("c", 3);
        const vals = conf.values();
        assert.equal(vals.length, 3);
        assert.isTrue(vals.includes(1));
        assert.isTrue(vals.includes(2));
        assert.isTrue(vals.includes(3));
    });

    it("entries()", () => {
        conf.set("a", 1);
        conf.set("b", 2);
        conf.set("c", 3);
        const entries = conf.entries();
        assert.equal(entries.length, 3);
        assert.deepEqual(entries, [["a", 1], ["b", 2], ["c", 3]]);
    });
});
