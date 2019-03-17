// 4.1.2 Reflect.defineMetadata ( metadataKey, metadataValue, target, propertyKey )
// https://rbuckton.github.io/reflect-metadata/#reflect.definemetadata

describe("Reflect.defineMetadata", () => {
    it("InvalidTarget", () => {
        assert.throws(() => {
            return Reflect.defineMetadata("key", "value", undefined, undefined); 
        }, TypeError);
    });
    it("ValidTargetWithoutTargetKey", () => {
        assert.doesNotThrow(() => {
            return Reflect.defineMetadata("key", "value", {}, undefined); 
        });
    });
    it("ValidTargetWithTargetKey", () => {
        assert.doesNotThrow(() => {
            return Reflect.defineMetadata("key", "value", {}, "name"); 
        });
    });
});
//# sourceMappingURL=reflect-definemetadata.js.map
