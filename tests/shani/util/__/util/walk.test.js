describe("shani", "util", "__", "util", "walk", () => {
    const { __: { util: { walk } }, spy: createSpy } = adone.shani.util;

    it("should call iterator with value, key, and obj, with context as the receiver", () => {
        const target = Object.create(null);
        const rcvr = {};
        const iterator = createSpy();

        target.hello = "world";
        target.foo = 15;

        walk(target, iterator, rcvr);

        assert(iterator.calledTwice);
        assert(iterator.alwaysCalledOn(rcvr));
        assert(iterator.calledWithExactly("hello", target));
        assert(iterator.calledWithExactly("foo", target));
    });

    it("should work with non-enumerable properties", () => {
        const target = Object.create(null);
        const iterator = createSpy();

        target.hello = "world";
        Object.defineProperty(target, "foo", {
            value: 15
        });

        walk(target, iterator);

        assert(iterator.calledTwice);
        assert(iterator.calledWith("hello"));
        assert(iterator.calledWith("foo"));
    });

    it("should walk the prototype chain of an object", () => {
        let parentProto, proto, target, iterator;

        parentProto = Object.create(null, {
            nonEnumerableParentProp: {
                value: "non-enumerable parent prop"
            },
            enumerableParentProp: {
                value: "enumerable parent prop",
                enumerable: true
            }
        });

        proto = Object.create(parentProto, {
            nonEnumerableProp: {
                value: "non-enumerable prop"
            },
            enumerableProp: {
                value: "enumerable prop",
                enumerable: true
            }
        });

        target = Object.create(proto, {
            nonEnumerableOwnProp: {
                value: "non-enumerable own prop"
            },
            enumerableOwnProp: {
                value: "enumerable own prop",
                enumerable: true
            }
        });

        iterator = createSpy();

        walk(target, iterator);

        assert.equal(iterator.callCount, 6);
        assert(iterator.calledWith("nonEnumerableOwnProp", target));
        assert(iterator.calledWith("enumerableOwnProp", target));
        assert(iterator.calledWith("nonEnumerableProp", proto));
        assert(iterator.calledWith("enumerableProp", proto));
        assert(iterator.calledWith("nonEnumerableParentProp", parentProto));
        assert(iterator.calledWith("enumerableParentProp", parentProto));
    });

    it("should not invoke getters on the original receiving object", () => {
        const Target = function Target() {};
        const getter = createSpy();
        Object.defineProperty(Target.prototype, "computedFoo", {
            enumerable: true,
            get: getter
        });
        const target = new Target();
        const iterator = createSpy();

        walk(target, iterator);

        assert(iterator.calledWith("computedFoo", target));
        assert(getter.notCalled);
    });

    it("does not walk the same property twice", () => {
        const parent = {
            func: function parentFunc() {}
        };
        const child = Object.create(parent);
        child.func = function childFunc() {};
        const iterator = createSpy();

        walk(child, iterator);

        const propertyNames = iterator.args.map((call) => {
            return call[0];
        });

        // make sure that each property name only exists once
        propertyNames.forEach((name, index) => {
            assert.equal(index, propertyNames.lastIndexOf(name));
        });
    });
});
