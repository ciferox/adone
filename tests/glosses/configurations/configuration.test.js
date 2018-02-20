const {
    is
} = adone;

describe("configuration", "Base", () => {
    let conf;
    let proto;

    beforeEach(() => {
        conf = new adone.configuration.Base();
        proto = conf.__proto__;
    });

    it("should have map-like interface", () => {
        assert.true(is.propertyOwned(proto, "set"));
        assert.true(is.propertyOwned(proto, "get"));
        assert.true(is.propertyOwned(proto, "has"));
        assert.true(is.propertyOwned(proto, "delete"));
        assert.true(is.propertyOwned(proto, "keys"));
        assert.true(is.propertyOwned(proto, "values"));
        assert.true(is.propertyOwned(proto, "entries"));
        assert.true(is.propertyOwned(proto, "load"));
        assert.true(is.propertyOwned(proto, "save"));
    });

    it("should get undefined of nonexisting key", () => {
        assert.undefined(conf.get("nonexists"));
    });

    it("should correctly check key", () => {
        assert.throws(() => (conf.get(1)), adone.error.InvalidArgument);
        assert.throws(() => (conf.get({})), adone.error.InvalidArgument);
        assert.throws(() => (conf.get(true)), adone.error.InvalidArgument);
        assert.throws(() => (conf.get("")), adone.error.InvalidArgument);
        assert.throws(() => (conf.get([""])), adone.error.InvalidArgument);
    });

    it("raw access to property", () => {
        conf.set("a", 10);
        assert.equal(conf.raw.a, 10);
    });

    it("should set value of complex key", () => {
        conf.set("a.b", 10);
        assert.equal(conf.get("a.b"), 10);
        assert.equal(conf.raw.a.b, 10);
        conf.set("a.c.d", 20);
        assert.equal(conf.get("a.c.d"), 20);
        assert.equal(conf.raw.a.c.d, 20);
        conf.set("a.d.e.f.g", 30);
        assert.equal(conf.get("a.d.e.f.g"), 30);
        assert.equal(conf.raw.a.d.e.f.g, 30);
    });

    it("should reassign value of non-plain object", () => {
        conf.set("a.b", 10);
        assert.equal(conf.raw.a.b, 10);
        conf.set("a.b.d", 20);
        assert.equal(conf.raw.a.b.d, 20);
    });

    it("should reassign value of middle subkey", () => {
        conf.set("a.b.c", 10);
        assert.equal(conf.raw.a.b.c, 10);
        conf.set("a.b", 20);
        assert.equal(conf.raw.a.b, 20);
    });

    it("should has() correcly check existence of key", () => {
        conf.set("a.b.c", 10);
        assert.true(conf.has("a"));
        assert.true(conf.has("a.b"));
        assert.true(conf.has("a.b.c"));
        assert.false(conf.has("a.b.c.d"));

        class A {
            constructor() {
                this.val = 1;
            }
        }

        conf.set("a.b.a", new A());
        assert.true(conf.has("a.b.a"));
        assert.true(conf.has("a.b.a.val"));
        assert.false(conf.has("a.b.a.other"));
    });

    it("should get() value of existence key", () => {
        conf.set("a.b.c", 10);
        assert.true(is.plainObject(conf.get("a")));
        assert.true(is.plainObject(conf.get("a.b")));
        assert.equal(conf.get("a.b.c"), 10);
        assert.undefined(conf.get("a.b.c.d"));

        class A {
            constructor() {
                this.val = 1;
            }
        }

        const a = new A();
        conf.set("a.b.a", a);
        assert.deepEqual(conf.get("a.b.a"), a);
        assert.equal(conf.get("a.b.a.val"), 1);
        assert.undefined(conf.get("a.b.a.other"));
    });

    it("should delete keys", () => {
        conf.set("a.b.c", 10);
        conf.delete("a.b.c");
        assert.true(conf.has("a.b"));
        assert.false(conf.has("a.b.c"));
        conf.delete("a");
        assert.false(conf.has("a"));
        assert.false(conf.has("a.b"));
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
        assert.equal(conf.raw.a, 1);
        assert.equal(conf.raw.b, 2);
        assert.equal(conf.raw.c, 3);
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
        assert.equal(conf.raw.a, 1);
        assert.equal(conf.raw.b, 2);
        assert.equal(conf.raw.c, 4);
        assert.equal(conf.raw.d, 5);
        assert.equal(conf.raw.e, 6);
    });

    it("assign() other configuration", () => {
        const otherConf = new adone.configuration.Base();
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
        assert.equal(conf.raw.a, 1);
        assert.equal(conf.raw.b, 2);
        assert.equal(conf.raw.c, 4);
        assert.equal(conf.raw.d, 5);
        assert.equal(conf.raw.e, 6);
    });

    it("assign() to non existing key", () => {
        conf.assign("adone", {
            a: 1,
            b: 2,
            c: 3
        });
        assert.equal(conf.raw.adone.a, 1);
        assert.equal(conf.raw.adone.b, 2);
        assert.equal(conf.raw.adone.c, 3);
    });

    it("keys()", () => {
        conf.set("a", 1);
        conf.set("b", 2);
        conf.set("c", 3);
        const keys = conf.keys();
        assert.equal(keys.length, 3);
        assert.true(keys.includes("a"));
        assert.true(keys.includes("b"));
        assert.true(keys.includes("c"));
    });

    it("values()", () => {
        conf.set("a", 1);
        conf.set("b", 2);
        conf.set("c", 3);
        const vals = conf.values();
        assert.equal(vals.length, 3);
        assert.true(vals.includes(1));
        assert.true(vals.includes(2));
        assert.true(vals.includes(3));
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
