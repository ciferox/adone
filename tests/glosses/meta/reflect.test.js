const { reflect } = adone.meta;

describe("meta", "reflect", () => {
    describe("metadata", () => {
        it("ReturnsDecoratorFunction", () => {
            const result = reflect.metadata("key", "value");
            assert.equal(typeof result, "function");
        });
        it("DecoratorThrowsWithInvalidTargetWithTargetKey", () => {
            const decorator = reflect.metadata("key", "value");
            assert.throws(() => decorator(undefined, "name"), TypeError);
        });
        it("DecoratorThrowsWithInvalidTargetKey", () => {
            const decorator = reflect.metadata("key", "value");
            assert.throws(() => decorator({}, {}), TypeError);
        });
        it("OnTargetWithoutTargetKey", () => {
            const decorator = reflect.metadata("key", "value");
            const target = function () { };
            decorator(target);
            const result = reflect.hasOwnMetadata("key", target, undefined);
            assert.equal(result, true);
        });
        it("OnTargetWithTargetKey", () => {
            const decorator = reflect.metadata("key", "value");
            const target = {};
            decorator(target, "name");
            const result = reflect.hasOwnMetadata("key", target, "name");
            assert.equal(result, true);
        });
    });

    describe("decorate", () => {
        it("ThrowsIfDecoratorsArgumentNotArrayForFunctionOverload", () => {
            const target = function () { };
            assert.throws(() => {
                return reflect.decorate(undefined, target, undefined, undefined);
            }, TypeError);
        });
        it("ThrowsIfTargetArgumentNotFunctionForFunctionOverload", () => {
            const decorators = [];
            const target = {};
            assert.throws(() => {
                return reflect.decorate(decorators, target, undefined, undefined);
            }, TypeError);
        });
        it("ThrowsIfDecoratorsArgumentNotArrayForPropertyOverload", () => {
            const target = {};
            const name = "name";
            assert.throws(() => {
                return reflect.decorate(undefined, target, name, undefined);
            }, TypeError);
        });
        it("ThrowsIfTargetArgumentNotObjectForPropertyOverload", () => {
            const decorators = [];
            const target = 1;
            const name = "name";
            assert.throws(() => {
                return reflect.decorate(decorators, target, name, undefined);
            }, TypeError);
        });
        it("ThrowsIfDecoratorsArgumentNotArrayForPropertyDescriptorOverload", () => {
            const target = {};
            const name = "name";
            const descriptor = {};
            assert.throws(() => {
                return reflect.decorate(undefined, target, name, descriptor);
            }, TypeError);
        });
        it("ThrowsIfTargetArgumentNotObjectForPropertyDescriptorOverload", () => {
            const decorators = [];
            const target = 1;
            const name = "name";
            const descriptor = {};
            assert.throws(() => {
                return reflect.decorate(decorators, target, name, descriptor);
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
            reflect.decorate(decorators, target);
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
            reflect.decorate(decorators, target, name, undefined);
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
            reflect.decorate(decorators, target, name, descriptor);
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
            const result = reflect.decorate(decorators, target);
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
            const result = reflect.decorate(decorators, target, "name", undefined);
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
            const result = reflect.decorate(decorators, target, "name", C);
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
            reflect.decorate(decorators, target);
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
            reflect.decorate(decorators, target, "name");
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
            reflect.decorate(decorators, target, "name");
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
            reflect.decorate(decorators, target, "name", C);
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
            reflect.decorate(decorators, target, "name", C);
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
            reflect.decorate(decorators, target, "name", C);
            assert.deepEqual(sent, [C, B, A, A]);
        });
    });

    describe("defineMetadata", () => {
        it("InvalidTarget", () => {
            assert.throws(() => reflect.defineMetadata("key", "value", undefined, undefined), TypeError);
        });
        it("ValidTargetWithoutTargetKey", () => {
            assert.doesNotThrow(() => reflect.defineMetadata("key", "value", {}, undefined));
        });
        it("ValidTargetWithTargetKey", () => {
            assert.doesNotThrow(() => reflect.defineMetadata("key", "value", {}, "name"));
        });
    });

    describe("deleteMetadata", () => {
        it("InvalidTarget", () => {
            assert.throws(() => {
                return reflect.deleteMetadata("key", undefined, undefined);
            }, TypeError);
        });
        it("WhenNotDefinedWithoutTargetKey", () => {
            const obj = {};
            const result = reflect.deleteMetadata("key", obj, undefined);
            assert.equal(result, false);
        });
        it("WhenDefinedWithoutTargetKey", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, undefined);
            const result = reflect.deleteMetadata("key", obj, undefined);
            assert.equal(result, true);
        });
        it("WhenDefinedOnPrototypeWithoutTargetKey", () => {
            const prototype = {};
            reflect.defineMetadata("key", "value", prototype, undefined);
            const obj = Object.create(prototype);
            const result = reflect.deleteMetadata("key", obj, undefined);
            assert.equal(result, false);
        });
        it("AfterDeleteMetadata", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, undefined);
            reflect.deleteMetadata("key", obj, undefined);
            const result = reflect.hasOwnMetadata("key", obj, undefined);
            assert.equal(result, false);
        });
    });

    describe("getMetadata", () => {
        it("InvalidTarget", () => {
            assert.throws(() => {
                return reflect.getMetadata("key", undefined, undefined);
            }, TypeError);
        });
        it("WithoutTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.getMetadata("key", obj, undefined);
            assert.equal(result, undefined);
        });
        it("WithoutTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, undefined);
            const result = reflect.getMetadata("key", obj, undefined);
            assert.equal(result, "value");
        });
        it("WithoutTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, undefined);
            const result = reflect.getMetadata("key", obj, undefined);
            assert.equal(result, "value");
        });
        it("WithTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.getMetadata("key", obj, "name");
            assert.equal(result, undefined);
        });
        it("WithTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, "name");
            const result = reflect.getMetadata("key", obj, "name");
            assert.equal(result, "value");
        });
        it("WithTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, "name");
            const result = reflect.getMetadata("key", obj, "name");
            assert.equal(result, "value");
        });
    });

    describe("getMetadataKeys", () => {
        it("KeysInvalidTarget", () => {
            // 1. If Type(target) is not Object, throw a TypeError exception.
            assert.throws(() => {
                return reflect.getMetadataKeys(undefined, undefined);
            }, TypeError);
        });
        it("KeysWithoutTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.getMetadataKeys(obj, undefined);
            assert.deepEqual(result, []);
        });
        it("KeysWithoutTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, undefined);
            const result = reflect.getMetadataKeys(obj, undefined);
            assert.deepEqual(result, ["key"]);
        });
        it("KeysWithoutTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, undefined);
            const result = reflect.getMetadataKeys(obj, undefined);
            assert.deepEqual(result, ["key"]);
        });
        it("KeysOrderWithoutTargetKey", () => {
            const obj = {};
            reflect.defineMetadata("key1", "value", obj, undefined);
            reflect.defineMetadata("key0", "value", obj, undefined);
            const result = reflect.getMetadataKeys(obj, undefined);
            assert.deepEqual(result, ["key1", "key0"]);
        });
        it("KeysOrderAfterRedefineWithoutTargetKey", () => {
            const obj = {};
            reflect.defineMetadata("key1", "value", obj, undefined);
            reflect.defineMetadata("key0", "value", obj, undefined);
            reflect.defineMetadata("key1", "value", obj, undefined);
            const result = reflect.getMetadataKeys(obj, undefined);
            assert.deepEqual(result, ["key1", "key0"]);
        });
        it("KeysOrderWithoutTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            reflect.defineMetadata("key2", "value", prototype, undefined);
            const obj = Object.create(prototype);
            reflect.defineMetadata("key1", "value", obj, undefined);
            reflect.defineMetadata("key0", "value", obj, undefined);
            const result = reflect.getMetadataKeys(obj, undefined);
            assert.deepEqual(result, ["key1", "key0", "key2"]);
        });
        it("KeysWithTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.getMetadataKeys(obj, "name");
            assert.deepEqual(result, []);
        });
        it("KeysWithTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, "name");
            const result = reflect.getMetadataKeys(obj, "name");
            assert.deepEqual(result, ["key"]);
        });
        it("KeysWithTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, "name");
            const result = reflect.getMetadataKeys(obj, "name");
            assert.deepEqual(result, ["key"]);
        });
        it("KeysOrderAfterRedefineWithTargetKey", () => {
            const obj = {};
            reflect.defineMetadata("key1", "value", obj, "name");
            reflect.defineMetadata("key0", "value", obj, "name");
            reflect.defineMetadata("key1", "value", obj, "name");
            const result = reflect.getMetadataKeys(obj, "name");
            assert.deepEqual(result, ["key1", "key0"]);
        });
        it("KeysOrderWithTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            reflect.defineMetadata("key2", "value", prototype, "name");
            const obj = Object.create(prototype);
            reflect.defineMetadata("key1", "value", obj, "name");
            reflect.defineMetadata("key0", "value", obj, "name");
            const result = reflect.getMetadataKeys(obj, "name");
            assert.deepEqual(result, ["key1", "key0", "key2"]);
        });
    });

    describe("getOwnMetadata", () => {
        it("InvalidTarget", () => {
            assert.throws(() => {
                return reflect.getOwnMetadata("key", undefined, undefined);
            }, TypeError);
        });
        it("WithoutTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.getOwnMetadata("key", obj, undefined);
            assert.equal(result, undefined);
        });
        it("WithoutTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, undefined);
            const result = reflect.getOwnMetadata("key", obj, undefined);
            assert.equal(result, "value");
        });
        it("WithoutTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, undefined);
            const result = reflect.getOwnMetadata("key", obj, undefined);
            assert.equal(result, undefined);
        });
        it("WithTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.getOwnMetadata("key", obj, "name");
            assert.equal(result, undefined);
        });
        it("WithTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, "name");
            const result = reflect.getOwnMetadata("key", obj, "name");
            assert.equal(result, "value");
        });
        it("WithTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, "name");
            const result = reflect.getOwnMetadata("key", obj, "name");
            assert.equal(result, undefined);
        });
    });

    describe("getOwnMetadataKeys", () => {
        it("KeysKeysInvalidTarget", () => {
            // 1. If Type(target) is not Object, throw a TypeError exception.
            assert.throws(() => {
                return reflect.getOwnMetadataKeys(undefined, undefined);
            }, TypeError);
        });
        it("KeysWithoutTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.getOwnMetadataKeys(obj, undefined);
            assert.deepEqual(result, []);
        });
        it("KeysWithoutTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, undefined);
            const result = reflect.getOwnMetadataKeys(obj, undefined);
            assert.deepEqual(result, ["key"]);
        });
        it("KeysWithoutTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, undefined);
            const result = reflect.getOwnMetadataKeys(obj, undefined);
            assert.deepEqual(result, []);
        });
        it("KeysOrderWithoutTargetKey", () => {
            const obj = {};
            reflect.defineMetadata("key1", "value", obj, undefined);
            reflect.defineMetadata("key0", "value", obj, undefined);
            const result = reflect.getOwnMetadataKeys(obj, undefined);
            assert.deepEqual(result, ["key1", "key0"]);
        });
        it("KeysOrderAfterRedefineWithoutTargetKey", () => {
            const obj = {};
            reflect.defineMetadata("key1", "value", obj, undefined);
            reflect.defineMetadata("key0", "value", obj, undefined);
            reflect.defineMetadata("key1", "value", obj, undefined);
            const result = reflect.getOwnMetadataKeys(obj, undefined);
            assert.deepEqual(result, ["key1", "key0"]);
        });
        it("KeysWithTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.getOwnMetadataKeys(obj, "name");
            assert.deepEqual(result, []);
        });
        it("KeysWithTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, "name");
            const result = reflect.getOwnMetadataKeys(obj, "name");
            assert.deepEqual(result, ["key"]);
        });
        it("KeysWithTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, "name");
            const result = reflect.getOwnMetadataKeys(obj, "name");
            assert.deepEqual(result, []);
        });
        it("KeysOrderAfterRedefineWithTargetKey", () => {
            const obj = {};
            reflect.defineMetadata("key1", "value", obj, "name");
            reflect.defineMetadata("key0", "value", obj, "name");
            reflect.defineMetadata("key1", "value", obj, "name");
            const result = reflect.getOwnMetadataKeys(obj, "name");
            assert.deepEqual(result, ["key1", "key0"]);
        });
    });

    describe("hasMetadata", () => {
        it("InvalidTarget", () => {
            assert.throws(() => {
                return reflect.hasMetadata("key", undefined, undefined);
            }, TypeError);
        });
        it("WithoutTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.hasMetadata("key", obj, undefined);
            assert.equal(result, false);
        });
        it("WithoutTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, undefined);
            const result = reflect.hasMetadata("key", obj, undefined);
            assert.equal(result, true);
        });
        it("WithoutTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, undefined);
            const result = reflect.hasMetadata("key", obj, undefined);
            assert.equal(result, true);
        });
        it("WithTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.hasMetadata("key", obj, "name");
            assert.equal(result, false);
        });
        it("WithTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, "name");
            const result = reflect.hasMetadata("key", obj, "name");
            assert.equal(result, true);
        });
        it("WithTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, "name");
            const result = reflect.hasMetadata("key", obj, "name");
            assert.equal(result, true);
        });
    });

    describe("hasOwnMetadata", () => {
        it("InvalidTarget", () => {
            assert.throws(() => {
                return reflect.hasOwnMetadata("key", undefined, undefined);
            }, TypeError);
        });
        it("WithoutTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.hasOwnMetadata("key", obj, undefined);
            assert.equal(result, false);
        });
        it("WithoutTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, undefined);
            const result = reflect.hasOwnMetadata("key", obj, undefined);
            assert.equal(result, true);
        });
        it("WithoutTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, undefined);
            const result = reflect.hasOwnMetadata("key", obj, undefined);
            assert.equal(result, false);
        });
        it("WithTargetKeyWhenNotDefined", () => {
            const obj = {};
            const result = reflect.hasOwnMetadata("key", obj, "name");
            assert.equal(result, false);
        });
        it("WithTargetKeyWhenDefined", () => {
            const obj = {};
            reflect.defineMetadata("key", "value", obj, "name");
            const result = reflect.hasOwnMetadata("key", obj, "name");
            assert.equal(result, true);
        });
        it("WithTargetKeyWhenDefinedOnPrototype", () => {
            const prototype = {};
            const obj = Object.create(prototype);
            reflect.defineMetadata("key", "value", prototype, "name");
            const result = reflect.hasOwnMetadata("key", obj, "name");
            assert.equal(result, false);
        });
    });
});
