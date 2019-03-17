// 4.1.8 Reflect.getMetadataKeys ( target [, propertyKey] )
// https://rbuckton.github.io/reflect-metadata/#reflect.getmetadatakeys
describe("Reflect.getMetadataKeys", () => {
    it("KeysInvalidTarget", () => {
        // 1. If Type(target) is not Object, throw a TypeError exception.
        assert.throws(() => {
            return Reflect.getMetadataKeys(undefined, undefined); 
        }, TypeError);
    });
    it("KeysWithoutTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.getMetadataKeys(obj, undefined);
        assert.deepEqual(result, []);
    });
    it("KeysWithoutTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, undefined);
        const result = Reflect.getMetadataKeys(obj, undefined);
        assert.deepEqual(result, ["key"]);
    });
    it("KeysWithoutTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, undefined);
        const result = Reflect.getMetadataKeys(obj, undefined);
        assert.deepEqual(result, ["key"]);
    });
    it("KeysOrderWithoutTargetKey", () => {
        const obj = {};
        Reflect.defineMetadata("key1", "value", obj, undefined);
        Reflect.defineMetadata("key0", "value", obj, undefined);
        const result = Reflect.getMetadataKeys(obj, undefined);
        assert.deepEqual(result, ["key1", "key0"]);
    });
    it("KeysOrderAfterRedefineWithoutTargetKey", () => {
        const obj = {};
        Reflect.defineMetadata("key1", "value", obj, undefined);
        Reflect.defineMetadata("key0", "value", obj, undefined);
        Reflect.defineMetadata("key1", "value", obj, undefined);
        const result = Reflect.getMetadataKeys(obj, undefined);
        assert.deepEqual(result, ["key1", "key0"]);
    });
    it("KeysOrderWithoutTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        Reflect.defineMetadata("key2", "value", prototype, undefined);
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key1", "value", obj, undefined);
        Reflect.defineMetadata("key0", "value", obj, undefined);
        const result = Reflect.getMetadataKeys(obj, undefined);
        assert.deepEqual(result, ["key1", "key0", "key2"]);
    });
    it("KeysWithTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.getMetadataKeys(obj, "name");
        assert.deepEqual(result, []);
    });
    it("KeysWithTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, "name");
        const result = Reflect.getMetadataKeys(obj, "name");
        assert.deepEqual(result, ["key"]);
    });
    it("KeysWithTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, "name");
        const result = Reflect.getMetadataKeys(obj, "name");
        assert.deepEqual(result, ["key"]);
    });
    it("KeysOrderAfterRedefineWithTargetKey", () => {
        const obj = {};
        Reflect.defineMetadata("key1", "value", obj, "name");
        Reflect.defineMetadata("key0", "value", obj, "name");
        Reflect.defineMetadata("key1", "value", obj, "name");
        const result = Reflect.getMetadataKeys(obj, "name");
        assert.deepEqual(result, ["key1", "key0"]);
    });
    it("KeysOrderWithTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        Reflect.defineMetadata("key2", "value", prototype, "name");
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key1", "value", obj, "name");
        Reflect.defineMetadata("key0", "value", obj, "name");
        const result = Reflect.getMetadataKeys(obj, "name");
        assert.deepEqual(result, ["key1", "key0", "key2"]);
    });
});
//# sourceMappingURL=reflect-getmetadatakeys.js.map
