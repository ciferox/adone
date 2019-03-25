import { B } from "./contexts";

const {
    is,
    netron: { Netron, meta: { Reflection }, Stub, Definition }
} = adone;

describe("Stub", () => {
    let netron;

    const createStubFor = (netron, obj) => new Stub(netron.stubManager, obj);

    before(() => {
        netron = new Netron();
    });

    it("create stub from context instance", () => {
        const b = new B();
        const stub = createStubFor(netron, b);

        assert.strictEqual(stub.instance, b);
        assert.instanceOf(stub.reflection, Reflection);
    });

    it("create stub from reflection instance", () => {
        const b = new B();
        const r = Reflection.from(b);
        const stub = createStubFor(netron, r);
        assert.strictEqual(stub.instance, b);
        assert.instanceOf(stub.reflection, Reflection);
    });

    it("definition of context", () => {
        const b = new B();
        const stub = createStubFor(netron, b);
        const def = stub.definition;

        assert.instanceOf(def, Definition);
        assert.strictEqual(def.id, 1);
        assert.strictEqual(def.parentId, 0);
        assert.equal(def.name, "B");
        assert.equal(def.description, "class b extends a");
    });

    describe("get()/call()", () => {
        let context;
        let stub;

        beforeEach(() => {
            context = new B();
            stub = createStubFor(netron, context);
        });

        it("should throw if get value of undefined property or call undefined method", () => {
            assert.throws(() => stub.get("nonexistent", [], netron.peer));
        });

        it("get value of writable property", () => {
            assert.equal(stub.get("propB", undefined, netron.peer), 2);
        });

        it("get value of readonly property", () => {
            assert.equal(stub.get("rpropB", undefined, netron.peer), 777);
        });

        it("get value of parent class property", () => {
            assert.equal(stub.get("propA", undefined, netron.peer), "aaa");
        });

        it("call sync method", () => {
            const result = stub.get("methodB", [], netron.peer);
            assert.isFalse(is.promise(result));
            assert.equal(result, "bbb");
        });

        it("call async method", async () => {
            const result = stub.get("asyncB", [], netron.peer);
            assert.isTrue(is.promise(result));
            assert.equal(await result, "ok");
        });

        it("call sync throwable method", () => {
            assert.throws(() => stub.get("syncErrorB", [], netron.peer), adone.error.InvalidArgumentException);
        });

        it("call async throwable method", async () => {
            await assert.throws(async () => stub.get("asyncErrorB", [], netron.peer), adone.error.InvalidArgumentException);
        });

        for (let c = 1; c < 10; c++) {
            //eslint-disable-next-line
            it(`call method with ${c} arguments`, () => {
                const args = [];
                for (let a = 0; a < c; a++) {
                    args.push(adone.text.random(10));
                }
                const result = stub.get("echoB", args, netron.peer);
                assert.deepEqual(result, args);
            });
        }
    });

    describe("set()/callVoid()", () => {
        let context;
        let stub;

        beforeEach(() => {
            context = new B();
            stub = createStubFor(netron, context);
        });

        it("should throw if set value of undefined property or call undefined method", () => {
            assert.throws(() => stub.set("nonexistent", [], netron.peer));
        });

        it("set value of writable property", () => {
            assert.equal(stub.get("propB", undefined, netron.peer), 2);
            assert.isUndefined(stub.set("propB", 10, netron.peer));
            assert.equal(stub.get("propB", undefined, netron.peer), 10);
        });

        it("set value of readonly property should have thrown", () => {
            assert.throws(() => stub.set("rpropB", undefined, netron.peer), adone.error.InvalidAccessException);
        });

        it("set value of parent class property", () => {
            assert.equal(stub.get("propA", undefined, netron.peer), "aaa");
            assert.isUndefined(stub.set("propA", 88, netron.peer));
            assert.equal(stub.get("propA", undefined, netron.peer), 88);
        });

        it("call sync method", () => {
            assert.isUndefined(stub.set("methodB", [], netron.peer));
        });

        it("call async mrthod", async () => {
            const result = stub.set("asyncB", [], netron.peer);
            assert.isTrue(is.promise(result));
            await result;
        });

        it("call sync throwable method", async () => {
            assert.throws(() => stub.set("syncErrorB", [], netron.peer), adone.error.InvalidArgumentException);
        });

        it("call async throwable method", async () => {
            await assert.throws(async () => stub.set("asyncErrorB", [], netron.peer), adone.error.InvalidArgumentException);
        });
    });
}); 
