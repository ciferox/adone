describe("Reflect.decorate", () => {
    it("ThrowsIfDecoratorsArgumentNotArrayForFunctionOverload", () => {
        const target = function () { };
        assert.throws(() => {
            return Reflect.decorate(undefined, target, undefined, undefined);
        }, TypeError);
    });
    it("ThrowsIfTargetArgumentNotFunctionForFunctionOverload", () => {
        const decorators = [];
        const target = {};
        assert.throws(() => {
            return Reflect.decorate(decorators, target, undefined, undefined);
        }, TypeError);
    });
    it("ThrowsIfDecoratorsArgumentNotArrayForPropertyOverload", () => {
        const target = {};
        const name = "name";
        assert.throws(() => {
            return Reflect.decorate(undefined, target, name, undefined);
        }, TypeError);
    });
    it("ThrowsIfTargetArgumentNotObjectForPropertyOverload", () => {
        const decorators = [];
        const target = 1;
        const name = "name";
        assert.throws(() => {
            return Reflect.decorate(decorators, target, name, undefined);
        }, TypeError);
    });
    it("ThrowsIfDecoratorsArgumentNotArrayForPropertyDescriptorOverload", () => {
        const target = {};
        const name = "name";
        const descriptor = {};
        assert.throws(() => {
            return Reflect.decorate(undefined, target, name, descriptor);
        }, TypeError);
    });
    it("ThrowsIfTargetArgumentNotObjectForPropertyDescriptorOverload", () => {
        const decorators = [];
        const target = 1;
        const name = "name";
        const descriptor = {};
        assert.throws(() => {
            return Reflect.decorate(decorators, target, name, descriptor);
        }, TypeError);
    });
    it("ExecutesDecoratorsInReverseOrderForFunctionOverload", () => {
        const order = [];
        const decorators = [
            function (target) {
                order.push(0);
            },
            function (target) {
                order.push(1);
            }
        ];
        const target = function () { };
        Reflect.decorate(decorators, target);
        assert.deepEqual(order, [1, 0]);
    });
    it("ExecutesDecoratorsInReverseOrderForPropertyOverload", () => {
        const order = [];
        const decorators = [
            function (target, name) {
                order.push(0);
            },
            function (target, name) {
                order.push(1);
            }
        ];
        const target = {};
        const name = "name";
        Reflect.decorate(decorators, target, name, undefined);
        assert.deepEqual(order, [1, 0]);
    });
    it("ExecutesDecoratorsInReverseOrderForPropertyDescriptorOverload", () => {
        const order = [];
        const decorators = [
            function (target, name) {
                order.push(0);
            },
            function (target, name) {
                order.push(1);
            }
        ];
        const target = {};
        const name = "name";
        const descriptor = {};
        Reflect.decorate(decorators, target, name, descriptor);
        assert.deepEqual(order, [1, 0]);
    });
    it("DecoratorPipelineForFunctionOverload", () => {
        const A = function A() { };
        const B = function B() { };
        const decorators = [
            function (target) {
                return undefined;
            },
            function (target) {
                return A;
            },
            function (target) {
                return B;
            }
        ];
        const target = function () { };
        const result = Reflect.decorate(decorators, target);
        assert.strictEqual(result, A);
    });
    it("DecoratorPipelineForPropertyOverload", () => {
        const A = {};
        const B = {};
        const decorators = [
            function (target, name) {
                return undefined;
            },
            function (target, name) {
                return A;
            },
            function (target, name) {
                return B;
            }
        ];
        const target = {};
        const result = Reflect.decorate(decorators, target, "name", undefined);
        assert.strictEqual(result, A);
    });
    it("DecoratorPipelineForPropertyDescriptorOverload", () => {
        const A = {};
        const B = {};
        const C = {};
        const decorators = [
            function (target, name) {
                return undefined;
            },
            function (target, name) {
                return A;
            },
            function (target, name) {
                return B;
            }
        ];
        const target = {};
        const result = Reflect.decorate(decorators, target, "name", C);
        assert.strictEqual(result, A);
    });
    it("DecoratorCorrectTargetInPipelineForFunctionOverload", () => {
        const sent = [];
        const A = function A() { };
        const B = function B() { };
        const decorators = [
            function (target) {
                sent.push(target); return undefined;
            },
            function (target) {
                sent.push(target); return undefined;
            },
            function (target) {
                sent.push(target); return A;
            },
            function (target) {
                sent.push(target); return B;
            }
        ];
        const target = function () { };
        Reflect.decorate(decorators, target);
        assert.deepEqual(sent, [target, B, A, A]);
    });
    it("DecoratorCorrectTargetInPipelineForPropertyOverload", () => {
        const sent = [];
        const decorators = [
            function (target, name) {
                sent.push(target);
            },
            function (target, name) {
                sent.push(target);
            },
            function (target, name) {
                sent.push(target);
            },
            function (target, name) {
                sent.push(target);
            }
        ];
        const target = {};
        Reflect.decorate(decorators, target, "name");
        assert.deepEqual(sent, [target, target, target, target]);
    });
    it("DecoratorCorrectNameInPipelineForPropertyOverload", () => {
        const sent = [];
        const decorators = [
            function (target, name) {
                sent.push(name);
            },
            function (target, name) {
                sent.push(name);
            },
            function (target, name) {
                sent.push(name);
            },
            function (target, name) {
                sent.push(name);
            }
        ];
        const target = {};
        Reflect.decorate(decorators, target, "name");
        assert.deepEqual(sent, ["name", "name", "name", "name"]);
    });
    it("DecoratorCorrectTargetInPipelineForPropertyDescriptorOverload", () => {
        const sent = [];
        const A = {};
        const B = {};
        const C = {};
        const decorators = [
            function (target, name) {
                sent.push(target); return undefined;
            },
            function (target, name) {
                sent.push(target); return undefined;
            },
            function (target, name) {
                sent.push(target); return A;
            },
            function (target, name) {
                sent.push(target); return B;
            }
        ];
        const target = {};
        Reflect.decorate(decorators, target, "name", C);
        assert.deepEqual(sent, [target, target, target, target]);
    });
    it("DecoratorCorrectNameInPipelineForPropertyDescriptorOverload", () => {
        const sent = [];
        const A = {};
        const B = {};
        const C = {};
        const decorators = [
            function (target, name) {
                sent.push(name); return undefined;
            },
            function (target, name) {
                sent.push(name); return undefined;
            },
            function (target, name) {
                sent.push(name); return A;
            },
            function (target, name) {
                sent.push(name); return B;
            }
        ];
        const target = {};
        Reflect.decorate(decorators, target, "name", C);
        assert.deepEqual(sent, ["name", "name", "name", "name"]);
    });
    it("DecoratorCorrectDescriptorInPipelineForPropertyDescriptorOverload", () => {
        const sent = [];
        const A = {};
        const B = {};
        const C = {};
        const decorators = [
            function (target, name, descriptor) {
                sent.push(descriptor); return undefined;
            },
            function (target, name, descriptor) {
                sent.push(descriptor); return undefined;
            },
            function (target, name, descriptor) {
                sent.push(descriptor); return A;
            },
            function (target, name, descriptor) {
                sent.push(descriptor); return B;
            }
        ];
        const target = {};
        Reflect.decorate(decorators, target, "name", C);
        assert.deepEqual(sent, [C, B, A, A]);
    });
});
