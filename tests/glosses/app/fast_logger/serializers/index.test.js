const { sink, once } = require("../helper");

const {
    app: { fastLogger }
} = adone;

const parentSerializers = {
    test: () => "parent"
};

const childSerializers = {
    test: () => "child"
};

describe("app", "fastLogger", "serializers", () => {
    it("default err namespace error serializer", async () => {
        const stream = sink();
        const parent = fastLogger(stream);

        parent.info({ err: new ReferenceError("test") });
        const o = await once(stream, "data");
        assert.object(o.err);
        assert.equal(o.err.type, "ReferenceError");
        assert.equal(o.err.message, "test");
        assert.string(o.err.stack);
    });

    it("custom serializer overrides default err namespace error serializer", async () => {
        const stream = sink();
        const parent = fastLogger({
            serializers: {
                err: (e) => ({
                    t: e.constructor.name,
                    m: e.message,
                    s: e.stack
                })
            }
        }, stream);

        parent.info({ err: new ReferenceError("test") });
        const o = await once(stream, "data");
        assert.object(o.err);
        assert.equal(o.err.t, "ReferenceError");
        assert.equal(o.err.m, "test");
        assert.string(o.err.s);
    });

    it("null overrides default err namespace error serializer", async () => {
        const stream = sink();
        const parent = fastLogger({ serializers: { err: null } }, stream);

        parent.info({ err: new ReferenceError("test") });
        const o = await once(stream, "data");
        assert.object(o.err);
        assert.undefined(o.err.type);
        assert.undefined(o.err.message);
        assert.undefined(o.err.stack);
    });

    it("undefined overrides default err namespace error serializer", async () => {
        const stream = sink();
        const parent = fastLogger({ serializers: { err: undefined } }, stream);

        parent.info({ err: new ReferenceError("test") });
        const o = await once(stream, "data");
        assert.object(o.err);
        assert.undefined(o.err.type);
        assert.undefined(o.err.message);
        assert.undefined(o.err.stack);
    });

    it("serializers override values", async () => {
        const stream = sink();
        const parent = fastLogger({ serializers: parentSerializers }, stream);
        parent.child({ serializers: childSerializers });

        parent.fatal({ test: "test" });
        const o = await once(stream, "data");
        assert.equal(o.test, "parent");
    });

    it("child does not overwrite parent serializers", async () => {
        const stream = sink();
        const parent = fastLogger({ serializers: parentSerializers }, stream);
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
        const parent = fastLogger({ serializers: parentSerializers }, stream);
        const child = parent.child({ a: "property" });

        assert.equal(parent[Symbol.for("pino.serializers")], parentSerializers);
        assert.equal(child[Symbol.for("pino.serializers")], parentSerializers);

        const a = () => "hello";

        const child2 = parent.child({
            serializers: {
                a
            }
        });


        assert.notEqual(child2[Symbol.for("pino.serializers")], parentSerializers);
        assert.equal(child2[Symbol.for("pino.serializers")].a, a);
        assert.equal(child2[Symbol.for("pino.serializers")].test, parentSerializers.test);
    });

    it("children inherit parent serializers", async () => {
        const stream = sink();
        const parent = fastLogger({ serializers: parentSerializers }, stream);

        const child = parent.child({ a: "property" });
        child.fatal({ test: "test" });
        const o = await once(stream, "data");
        assert.equal(o.test, "parent");
    });

    it("children serializers get called", async () => {
        const stream = sink();
        const parent = fastLogger({
            test: "this"
        }, stream);

        const child = parent.child({ a: "property", serializers: childSerializers });

        child.fatal({ test: "test" });
        const o = await once(stream, "data");
        assert.equal(o.test, "child");
    });

    it("children serializers get called when inherited from parent", async () => {
        const stream = sink();
        const parent = fastLogger({
            test: "this",
            serializers: parentSerializers
        }, stream);

        const child = parent.child({
            serializers: {
                test() {
                    return "pass";
                }
            }
        });

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

        const parent = fastLogger({ serializers: pSerializers }, stream);

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

        const logger = fastLogger({ serializers: globalSerializer }, stream);

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
        assert.false("pid" in (await o3));
        assert.false("hostname" in (await o3));
        assert.notSameMembers(Object.keys(await o3), ["pid", "hostname"]);
    });
});
