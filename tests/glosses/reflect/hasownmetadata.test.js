// 4.1.5 Reflect.hasOwnMetadata ( metadataKey, target [, propertyKey] )
// https://rbuckton.github.io/reflect-metadata/#reflect.hasownmetadata

describe("Reflect.hasOwnMetadata", () => {
    it("InvalidTarget", () => {
        assert.throws(() => {
            return Reflect.hasOwnMetadata("key", undefined, undefined); 
        }, TypeError);
    });
    it("WithoutTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.hasOwnMetadata("key", obj, undefined);
        assert.equal(result, false);
    });
    it("WithoutTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, undefined);
        const result = Reflect.hasOwnMetadata("key", obj, undefined);
        assert.equal(result, true);
    });
    it("WithoutTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, undefined);
        const result = Reflect.hasOwnMetadata("key", obj, undefined);
        assert.equal(result, false);
    });
    it("WithTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.hasOwnMetadata("key", obj, "name");
        assert.equal(result, false);
    });
    it("WithTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, "name");
        const result = Reflect.hasOwnMetadata("key", obj, "name");
        assert.equal(result, true);
    });
    it("WithTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, "name");
        const result = Reflect.hasOwnMetadata("key", obj, "name");
        assert.equal(result, false);
    });
});
//# sourceMappingURL=reflect-hasownmetadata.js.map
