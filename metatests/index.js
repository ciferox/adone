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
});
