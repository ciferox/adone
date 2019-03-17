describe("Reflect", () => {
    it("does not overwrite existing implementation", () => {
        const defineMetadata = Reflect.defineMetadata;
        const reflectPath = adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "reflect", "index.js");
        const reflectContent = adone.std.fs.readFileSync(reflectPath, "utf8");
        const reflectFunction = Function(reflectContent);
        reflectFunction();
        assert.strictEqual(Reflect.defineMetadata, defineMetadata);
    });
});
