const { Default } = adone.database.level.backend;

describe("Destroy & Repair", () => {
    it("destroy() passes on arguments", () => {
        const ldmock = mock(Default);
        const args = ["location", function () { }];
        const expect = ldmock
            .expects("destroy")
            .once()
            .withExactArgs(args[0], args[1]);

        Default.destroy(...args);
        ldmock.verify();
    });

    it("repair() passes on arguments", () => {
        const ldmock = mock(Default);
        const args = ["location", function () { }];
        const expect = ldmock
            .expects("repair")
            .once()
            .withExactArgs(args[0], args[1]);

        Default.repair(...args);
        ldmock.verify();
    });

    it("destroy() substitutes missing callback argument", () => {
        const ldmock = mock(Default);
        const args = ["location"];
        const expect = ldmock
            .expects("destroy")
            .once()
            .withArgs(args[0]);

        Default.destroy(...args);
        ldmock.verify();
        assert.equal(1, expect.getCall(0).args.length);
    });

    it("repair() substitutes missing callback argument", () => {
        const ldmock = mock(Default);
        const args = ["location"];
        const expect = ldmock
            .expects("repair")
            .once()
            .withArgs(args[0]);

        Default.repair(...args);
        ldmock.verify();
        assert.equal(1, expect.getCall(0).args.length);
    });
});
