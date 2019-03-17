// 4.1.2 Reflect.metadata ( metadataKey, metadataValue )
// https://rbuckton.github.io/reflect-metadata/#reflect.metadata

describe("Reflect.metadata", () => {
    it("ReturnsDecoratorFunction", () => {
        const result = Reflect.metadata("key", "value");
        assert.equal(typeof result, "function");
    });
    it("DecoratorThrowsWithInvalidTargetWithTargetKey", () => {
        const decorator = Reflect.metadata("key", "value");
        assert.throws(() => {
            return decorator(undefined, "name"); 
        }, TypeError);
    });
    it("DecoratorThrowsWithInvalidTargetKey", () => {
        const decorator = Reflect.metadata("key", "value");
        assert.throws(() => {
            return decorator({}, {}); 
        }, TypeError);
    });
    it("OnTargetWithoutTargetKey", () => {
        const decorator = Reflect.metadata("key", "value");
        const target = function () { };
        decorator(target);
        const result = Reflect.hasOwnMetadata("key", target, undefined);
        assert.equal(result, true);
    });
    it("OnTargetWithTargetKey", () => {
        const decorator = Reflect.metadata("key", "value");
        const target = {};
        decorator(target, "name");
        const result = Reflect.hasOwnMetadata("key", target, "name");
        assert.equal(result, true);
    });
});
//# sourceMappingURL=reflect-metadata.js.map
