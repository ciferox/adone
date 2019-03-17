// 4.1.10 Reflect.deleteMetadata ( metadataKey, target [, propertyKey] )
// https://rbuckton.github.io/reflect-metadata/#reflect.deletemetadata

describe("Reflect.deleteMetadata", () => {
    it("InvalidTarget", () => {
        assert.throws(() => {
            return Reflect.deleteMetadata("key", undefined, undefined); 
        }, TypeError);
    });
    it("WhenNotDefinedWithoutTargetKey", () => {
        const obj = {};
        const result = Reflect.deleteMetadata("key", obj, undefined);
        assert.equal(result, false);
    });
    it("WhenDefinedWithoutTargetKey", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, undefined);
        const result = Reflect.deleteMetadata("key", obj, undefined);
        assert.equal(result, true);
    });
    it("WhenDefinedOnPrototypeWithoutTargetKey", () => {
        const prototype = {};
        Reflect.defineMetadata("key", "value", prototype, undefined);
        const obj = Object.create(prototype);
        const result = Reflect.deleteMetadata("key", obj, undefined);
        assert.equal(result, false);
    });
    it("AfterDeleteMetadata", () => {
        const obj = {};
        Reflect.defineMetadata("key", "value", obj, undefined);
        Reflect.deleteMetadata("key", obj, undefined);
        const result = Reflect.hasOwnMetadata("key", obj, undefined);
        assert.equal(result, false);
    });
});
//# sourceMappingURL=reflect-deletemetadata.js.map
