const relPath = (p) => adone.std.path.relative(adone.appinstance.adoneRootPath, p);

describe("Meta tests", () => {
    it("is", async () => {
        const inspector = new adone.meta.code.Inspector();
        await inspector.attachNamespace("adone.is");
        const ns = inspector.getNamespace("adone.is");
        assert.equal(ns.name, "adone.is");
        assert.lengthOf(ns.modules, 1);
        assert.equal(relPath(ns.modules[0].path), adone.std.path.normalize("src/glosses/common/is.js"));
        const exports = Object.keys(ns.exports);
        assert.includeMembers(exports, [
            "nil",
            "null",
            "undefined",
            "boolean",
            "string",
            "number",
            "date",
            "buffer",
            "object",
            "plainObject",
            "array",
            "infinite",
            "propertyOwned",
            "odd",
            "even",
            "deepEqual"
        ]);
    });

    it("x", async () => {
        const inspector = new adone.meta.code.Inspector();
        await inspector.attachNamespace("adone.x");
        const ns = inspector.getNamespace("adone.x");
        assert.equal(ns.name, "adone.x");
        assert.lengthOf(ns.modules, 1);
        assert.equal(relPath(ns.modules[0].path), adone.std.path.normalize("src/glosses/common/x.js"));
        const exports = Object.keys(ns.exports);
        assert.includeMembers(exports, [
            "idExceptionMap",
            "exceptionIdMap",
            "stdIdMap",
            "stdExceptions",
            "adoneExceptions",
            "create",
            "Exception",
            "Runtime",
            "IncompleteBufferError",
            "NotImplemented",
            "IllegalState",
            "NotValid",
            "Unknown",
            "NotExists",
            "Exists",
            "Empty",
            "InvalidAccess",
            "NotSupported",
            "InvalidArgument",
            "InvalidNumberOfArguments",
            "NotFound",
            "Timeout",
            "Incorrect",
            "NotAllowed",
            "LimitExceeded",
            "Encoding"
        ]);
    });

    describe("data", () => {
        it("root namespace", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data");
            const ns = inspector.getNamespace("adone.data");
            assert.sameMembers(Object.keys(ns.exports), ["json"]);

            try {
                await inspector.attachNamespace("adone.data.json");
            } catch (err) {
                return;
            }
            assert.fail("Should have thrown");
        });

        it("subnamespace 'json5'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data.json5");
            const ns = inspector.getNamespace("adone.data.json5");
            assert.includeMembers(Object.keys(ns.exports), ["encode", "decode"]);
        });

        it("subnamespace 'bson'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data.bson");
            const ns = inspector.getNamespace("adone.data.bson");
            assert.includeMembers(Object.keys(ns.exports), ["encode", "decode"]);
        });

        it("subnamespace 'yaml'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data.yaml");
            const ns = inspector.getNamespace("adone.data.yaml");
            assert.includeMembers(Object.keys(ns.exports), ["encode", "decode"]);
        });

        it("subnamespace 'mpak'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data.mpak");
            const ns = inspector.getNamespace("adone.data.mpak");
            assert.includeMembers(Object.keys(ns.exports), ["encode", "decode"]);
        });

        it("subnamespace 'base64'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data.base64");
            const ns = inspector.getNamespace("adone.data.base64");
            assert.includeMembers(Object.keys(ns.exports), ["encode", "decode"]);
        });
    });

    describe("compressors", () => {
        it.skip("root namespace", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor");
            const ns = inspector.getNamespace("adone.compressor");
        });

        it("subnamespace 'gz'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor.gz");
            const ns = inspector.getNamespace("adone.compressor.gz");
            assert.includeMembers(Object.keys(ns.exports), ["compress", "decompress"]);
        });

        it("subnamespace 'deflate'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor.deflate");
            const ns = inspector.getNamespace("adone.compressor.deflate");
            assert.includeMembers(Object.keys(ns.exports), ["compress", "decompress"]);
        });
    });
});
