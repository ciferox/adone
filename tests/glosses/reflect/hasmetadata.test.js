// 4.1.4 Reflect.hasMetadata ( metadataKey, target [, propertyKey] )
// https://rbuckton.github.io/reflect-metadata/#reflect.hasmetadata

describe("Reflect.hasMetadata", () => {
    it("InvalidTarget", () => {
        assert.throws(() => {
            return Reflect.hasMetadata("key", undefined, undefined); 
        }, TypeError);
    });
    it("WithoutTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.hasMetadata("key", obj, undefined);
        assert.equal(result, false);
    });
    it("WithoutTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, undefined);
        const result = Reflect.hasMetadata("key", obj, undefined);
        assert.equal(result, true);
    });
    it("WithoutTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, undefined);
        const result = Reflect.hasMetadata("key", obj, undefined);
        assert.equal(result, true);
    });
    it("WithTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.hasMetadata("key", obj, "name");
        assert.equal(result, false);
    });
    it("WithTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, "name");
        const result = Reflect.hasMetadata("key", obj, "name");
        assert.equal(result, true);
    });
    it("WithTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, "name");
        const result = Reflect.hasMetadata("key", obj, "name");
        assert.equal(result, true);
    });
});
//# sourceMappingURL=reflect-hasmetadata.js.map
