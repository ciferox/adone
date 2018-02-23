const relPath = (p) => adone.std.path.relative(adone.ROOT_PATH, p);

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
        it.skip("root namespace", async () => {
            // NEED FIX THIS TEST!!!
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data");
            const ns = inspector.getNamespace("adone.data");
            assert.sameMembers(Object.keys(ns.exports), ["json", "json5", "bson", "base64", "mpak", "yaml"]);

            try {
                await inspector.attachNamespace("adone.data.json");
            } catch (err) {
                return;
            }
            assert.fail("Should have thrown");
        });

        it("json", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data.json");
            const ns = inspector.getNamespace("adone.data.json");
            assert.includeMembers(Object.keys(ns.exports), ["encode", "decode"/*, "encodeSafe", "decodeSafe"*/, "encodeStable", "any"]);
        });

        it("json5", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data.json5");
            const ns = inspector.getNamespace("adone.data.json5");
            assert.includeMembers(Object.keys(ns.exports), ["encode", "decode"]);
        });

        it("bson", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data.bson");
            const ns = inspector.getNamespace("adone.data.bson");
            assert.includeMembers(Object.keys(ns.exports), ["encode", "decode"]);
        });

        it("yaml", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.data.yaml");
            const ns = inspector.getNamespace("adone.data.yaml");
            assert.includeMembers(Object.keys(ns.exports), ["encode", "decode"]);
        });

        it("mpak", async () => {
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
        it("root namespace", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor");
            const ns = inspector.getNamespace("adone.compressor");
            assert.isTrue(Object.keys(ns.exports).length === 0);
        });

        it("subnamespace 'gz'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor.gz");
            const ns = inspector.getNamespace("adone.compressor.gz");
            assert.includeMembers(Object.keys(ns.exports), ["compress", "decompress", "compressSync", "decompressSync", "compressStream", "decompressStream"]);
        });

        it("subnamespace 'deflate'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor.deflate");
            const ns = inspector.getNamespace("adone.compressor.deflate");
            assert.includeMembers(Object.keys(ns.exports), ["compress", "decompress", "compressSync", "decompressSync", "compressStream", "decompressStream", "rawCompress", "rawCompressSync", "rawCompressStream", "rawDecompress", "rawDecompressSync", "rawDecompressStream"]);
        });

        it("subnamespace 'brotli'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor.brotli");
            const ns = inspector.getNamespace("adone.compressor.brotli");
            assert.includeMembers(Object.keys(ns.exports), ["compress", "decompress", "compressSync", "decompressSync", "compressStream", "decompressStream"]);
        });

        it("subnamespace 'xz'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor.xz");
            const ns = inspector.getNamespace("adone.compressor.xz");
            assert.includeMembers(Object.keys(ns.exports), ["compress", "decompress", "compressSync", "decompressSync", "compressStream", "decompressStream"]);
        });

        it("subnamespace 'lzma'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor.lzma");
            const ns = inspector.getNamespace("adone.compressor.lzma");
            assert.includeMembers(Object.keys(ns.exports), ["compress", "decompress", "compressSync", "decompressSync", "compressStream", "decompressStream"]);
        });

        it("subnamespace 'snappy'", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.compressor.snappy");
            const ns = inspector.getNamespace("adone.compressor.snappy");
            assert.includeMembers(Object.keys(ns.exports), ["compress", "decompress", "compressSync", "decompressSync", "isValidCompressed", "isValidCompressedSync"]);
        });
    });

    describe("util", () => {
        it("uuid", async () => {
            const inspector = new adone.meta.code.Inspector();
            await inspector.attachNamespace("adone.util.uuid");
            const ns = inspector.getNamespace("adone.util.uuid");
            assert.includeMembers(Object.keys(ns.exports), ["__", "v1", "v4", "v5"]);
            
            const privateModule = inspector.get("adone.util.uuid.__");
            assert.isTrue(adone.meta.code.is.module(privateModule));
            assert.includeMembers(Object.keys(privateModule.exports()), ["rnd16", "seedBytes", "bytesToUuid", "sha1"]);

            assert.isTrue(adone.meta.code.is.functionLike(inspector.get("adone.util.uuid.v1")));
            assert.isTrue(adone.meta.code.is.functionLike(inspector.get("adone.util.uuid.v4")));
            assert.isTrue(adone.meta.code.is.functionLike(inspector.get("adone.util.uuid.v5")));
        });
    });
});
