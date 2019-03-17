// 4.1.9 Reflect.getOwnMetadataKeysKeys ( target [, propertyKey] )
// https://rbuckton.github.io/reflect-metadata/#reflect.getownmetadatakeys
describe("Reflect.deleteMetadata", () => {
    it("KeysKeysInvalidTarget", () => {
        // 1. If Type(target) is not Object, throw a TypeError exception.
        assert.throws(() => {
            return Reflect.getOwnMetadataKeys(undefined, undefined); 
        }, TypeError);
    });
    it("KeysWithoutTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.getOwnMetadataKeys(obj, undefined);
        assert.deepEqual(result, []);
    });
    it("KeysWithoutTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, undefined);
        const result = Reflect.getOwnMetadataKeys(obj, undefined);
        assert.deepEqual(result, ["key"]);
    });
    it("KeysWithoutTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, undefined);
        const result = Reflect.getOwnMetadataKeys(obj, undefined);
        assert.deepEqual(result, []);
    });
    it("KeysOrderWithoutTargetKey", () => {
        const obj = {};
        Reflect.defineMetadata("key1", "value", obj, undefined);
        Reflect.defineMetadata("key0", "value", obj, undefined);
        const result = Reflect.getOwnMetadataKeys(obj, undefined);
        assert.deepEqual(result, ["key1", "key0"]);
    });
    it("KeysOrderAfterRedefineWithoutTargetKey", () => {
        const obj = {};
        Reflect.defineMetadata("key1", "value", obj, undefined);
        Reflect.defineMetadata("key0", "value", obj, undefined);
        Reflect.defineMetadata("key1", "value", obj, undefined);
        const result = Reflect.getOwnMetadataKeys(obj, undefined);
        assert.deepEqual(result, ["key1", "key0"]);
    });
    it("KeysWithTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.getOwnMetadataKeys(obj, "name");
        assert.deepEqual(result, []);
    });
    it("KeysWithTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, "name");
        const result = Reflect.getOwnMetadataKeys(obj, "name");
        assert.deepEqual(result, ["key"]);
    });
    it("KeysWithTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, "name");
        const result = Reflect.getOwnMetadataKeys(obj, "name");
        assert.deepEqual(result, []);
    });
    it("KeysOrderAfterRedefineWithTargetKey", () => {
        const obj = {};
        Reflect.defineMetadata("key1", "value", obj, "name");
        Reflect.defineMetadata("key0", "value", obj, "name");
        Reflect.defineMetadata("key1", "value", obj, "name");
        const result = Reflect.getOwnMetadataKeys(obj, "name");
        assert.deepEqual(result, ["key1", "key0"]);
    });
});
//# sourceMappingURL=reflect-getownmetadatakeys.js.map
