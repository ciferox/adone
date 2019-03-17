// 4.1.5 Reflect.getMetadata ( metadataKey, target [, propertyKey] )
// https://rbuckton.github.io/reflect-metadata/#reflect.getmetadata

describe("Reflect.getMetadata", () => {
    it("InvalidTarget", () => {
        assert.throws(() => {
            return Reflect.getMetadata("key", undefined, undefined); 
        }, TypeError);
    });
    it("WithoutTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.getMetadata("key", obj, undefined);
        assert.equal(result, undefined);
    });
    it("WithoutTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, undefined);
        const result = Reflect.getMetadata("key", obj, undefined);
        assert.equal(result, "value");
    });
    it("WithoutTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, undefined);
        const result = Reflect.getMetadata("key", obj, undefined);
        assert.equal(result, "value");
    });
    it("WithTargetKeyWhenNotDefined", () => {
        const obj = {};
        const result = Reflect.getMetadata("key", obj, "name");
        assert.equal(result, undefined);
    });
    it("WithTargetKeyWhenDefined", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, "name");
        const result = Reflect.getMetadata("key", obj, "name");
        assert.equal(result, "value");
    });
    it("WithTargetKeyWhenDefinedOnPrototype", () => {
        const prototype = {};
        const obj = Object.create(prototype);
        Reflect.defineMetadata("key", "value", prototype, "name");
        const result = Reflect.getMetadata("key", obj, "name");
        assert.equal(result, "value");
    });
});
//# sourceMappingURL=reflect-getmetadata.js.map
