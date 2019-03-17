// 4.1.7 Reflect.getOwnMetadata ( metadataKey, target [, propertyKey] )
// https://rbuckton.github.io/reflect-metadata/#reflect.getownmetadata

describe("Reflect.getOwnMetadata", () => {
    it("InvalidTarget", () => {
        assert.throws(() => {
            return Reflect.getOwnMetadata("key", undefined, undefined); 
        }, TypeError);
    });
    it("WithoutTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.getOwnMetadata("key", obj, undefined);
        assert.equal(result, undefined);
    });
    it("WithoutTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, undefined);
        const result = Reflect.getOwnMetadata("key", obj, undefined);
        assert.equal(result, "value");
    });
    it("WithoutTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, undefined);
        const result = Reflect.getOwnMetadata("key", obj, undefined);
        assert.equal(result, undefined);
    });
    it("WithTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.getOwnMetadata("key", obj, "name");
        assert.equal(result, undefined);
    });
    it("WithTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, "name");
        const result = Reflect.getOwnMetadata("key", obj, "name");
        assert.equal(result, "value");
    });
    it("WithTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, "name");
        const result = Reflect.getOwnMetadata("key", obj, "name");
        assert.equal(result, undefined);
    });
});
//# sourceMappingURL=reflect-getownmetadata.js.map
