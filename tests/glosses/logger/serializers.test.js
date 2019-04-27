const { sink, once } = require("./helper");

const parentSerializers = {
    test: () => "parent"
};

const childSerializers = {
    test: () => "child"
};

describe("serializers", () => {
    it("default err namespace error serializer", async () => {
        const stream = sink();
        const parent = adone.logger(stream);
    
        parent.info({ err: ReferenceError("test") });
        const o = await once(stream, "data");
        assert.equal(typeof o.err, "object");
        assert.equal(o.err.type, "ReferenceError");
        assert.equal(o.err.message, "test");
        assert.equal(typeof o.err.stack, "string");
    });
    
    it("custom serializer overrides default err namespace error serializer", async () => {
        const stream = sink();
        const parent = adone.logger({
            serializers: {
                err: (e) => ({
                    t: e.constructor.name,
                    m: e.message,
                    s: e.stack
                })
            }
        }, stream);
    
        parent.info({ err: ReferenceError("test") });
        const o = await once(stream, "data");
        assert.equal(typeof o.err, "object");
        assert.equal(o.err.t, "ReferenceError");
        assert.equal(o.err.m, "test");
        assert.equal(typeof o.err.s, "string");
    });
    
    it("null overrides default err namespace error serializer", async () => {
        const stream = sink();
        const parent = adone.logger({ serializers: { err: null } }, stream);
    
        parent.info({ err: ReferenceError("test") });
        const o = await once(stream, "data");
        assert.equal(typeof o.err, "object");
        assert.equal(typeof o.err.type, "undefined");
        assert.equal(typeof o.err.message, "undefined");
        assert.equal(typeof o.err.stack, "undefined");
    });
    
    it("undefined overrides default err namespace error serializer", async () => {
        const stream = sink();
        const parent = adone.logger({ serializers: { err: undefined } }, stream);
    
        parent.info({ err: ReferenceError("test") });
        const o = await once(stream, "data");
        assert.equal(typeof o.err, "object");
        assert.equal(typeof o.err.type, "undefined");
        assert.equal(typeof o.err.message, "undefined");
        assert.equal(typeof o.err.stack, "undefined");
    });
    
    it("serializers override values", async () => {
        const stream = sink();
        const parent = adone.logger({ serializers: parentSerializers }, stream);
        parent.child({ serializers: childSerializers });
    
        parent.fatal({ test: "test" });
        const o = await once(stream, "data");
        assert.equal(o.test, "parent");
    });
    
    it("child does not overwrite parent serializers", async () => {
        const stream = sink();
        const parent = adone.logger({ serializers: parentSerializers }, stream);
        const child = parent.child({ serializers: childSerializers });
    
        parent.fatal({ test: "test" });
    
        const o = once(stream, "data");
        assert.equal((await o).test, "parent");
        const o2 = once(stream, "data");
        child.fatal({ test: "test" });
        assert.equal((await o2).test, "child");
    });
    
    it("Symbol.for('pino.serializers')", async () => {
        const stream = sink();
        const parent = adone.logger({ serializers: parentSerializers }, stream);
        const child = parent.child({ a: "property" });
    
        assert.equal(parent[Symbol.for("pino.serializers")], parentSerializers);
        assert.equal(child[Symbol.for("pino.serializers")], parentSerializers);
    
        const child2 = parent.child({
            serializers: {
                a
            }
        });
    
        function a() {
            return "hello";
        }
    
        assert.notEqual(child2[Symbol.for("pino.serializers")], parentSerializers);
        assert.equal(child2[Symbol.for("pino.serializers")].a, a);
        assert.equal(child2[Symbol.for("pino.serializers")].test, parentSerializers.test);
    });
    
    it("children inherit parent serializers", async () => {
        const stream = sink();
        const parent = adone.logger({ serializers: parentSerializers }, stream);
    
        const child = parent.child({ a: "property" });
        child.fatal({ test: "test" });
        const o = await once(stream, "data");
        assert.equal(o.test, "parent");
    });
    
    it("children serializers get called", async () => {
        const stream = sink();
        const parent = adone.logger({
            test: "this"
        }, stream);
    
        const child = parent.child({ a: "property", serializers: childSerializers });
    
        child.fatal({ test: "test" });
        const o = await once(stream, "data");
        assert.equal(o.test, "child");
    });
    
    it("children serializers get called when inherited from parent", async () => {
        const stream = sink();
        const parent = adone.logger({
            test: "this",
            serializers: parentSerializers
        }, stream);
    
        const child = parent.child({ serializers: { test() {
            return "pass"; 
        } } });
    
        child.fatal({ test: "fail" });
        const o = await once(stream, "data");
        assert.equal(o.test, "pass");
    });
    
    it("non-overridden serializers are available in the children", async () => {
        const stream = sink();
        const pSerializers = {
            onlyParent() {
                return "parent"; 
            },
            shared() {
                return "parent"; 
            }
        };
    
        const cSerializers = {
            shared() {
                return "child"; 
            },
            onlyChild() {
                return "child"; 
            }
        };
    
        const parent = adone.logger({ serializers: pSerializers }, stream);
    
        const child = parent.child({ serializers: cSerializers });
    
        const o = once(stream, "data");
        child.fatal({ shared: "test" });
        assert.equal((await o).shared, "child");
        const o2 = once(stream, "data");
        child.fatal({ onlyParent: "test" });
        assert.equal((await o2).onlyParent, "parent");
        const o3 = once(stream, "data");
        child.fatal({ onlyChild: "test" });
        assert.equal((await o3).onlyChild, "child");
        const o4 = once(stream, "data");
        parent.fatal({ onlyChild: "test" });
        assert.equal((await o4).onlyChild, "test");
    });
    
    it("Symbol.for('pino.*') serializer", async () => {
        const stream = sink();
        const globalSerializer = {
            [Symbol.for("pino.*")](obj) {
                if (obj.lionel === "richie") {
                    return { hello: "is", it: "me", you: "are", looking: "for" };
                }
                return { lionel: "richie" };
            }
        };
    
        const logger = adone.logger({ serializers: globalSerializer }, stream);
    
        const o = once(stream, "data");
        logger.info({ hello: "is", it: "me", you: "are", looking: "for" });
        assert.equal((await o).lionel, "richie");
        assert.notEqual((await o).hello, "is");
        assert.notEqual((await o).it, "me");
        assert.notEqual((await o).you, "are");
        assert.notEqual((await o).looking, "for");
    
        const o2 = once(stream, "data");
        logger.info({ lionel: "richie" });
        assert.equal((await o2).lionel, "richie");
        assert.equal((await o2).hello, "is");
        assert.equal((await o2).it, "me");
        assert.equal((await o2).you, "are");
        assert.equal((await o2).looking, "for");
    
        const o3 = once(stream, "data");
        logger.info("message");
        assert.equal((await o3).lionel, "richie");
        assert.equal("pid" in (await o3), false);
        assert.equal("hostname" in (await o3), false);
        assert.notDeepEqual(await o3, ["pid", "hostname"]);
    });    
});
