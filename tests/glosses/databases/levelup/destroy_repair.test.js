const leveldown = require("leveldown");

describe("Destroy & Repair", () => {
    it("destroy() passes on arguments", () => {
        const ldmock = mock(leveldown);
        const args = ["location", function () { }];
        const expect = ldmock
            .expects("destroy")
            .once()
            .withExactArgs(args[0], args[1]);

        leveldown.destroy(...args);
        ldmock.verify();
    });

    it("repair() passes on arguments", () => {
        const ldmock = mock(leveldown);
        const args = ["location", function () { }];
        const expect = ldmock
            .expects("repair")
            .once()
            .withExactArgs(args[0], args[1]);

        leveldown.repair(...args);
        ldmock.verify();
    });

    it("destroy() substitutes missing callback argument", () => {
        const ldmock = mock(leveldown);
        const args = ["location"];
        const expect = ldmock
            .expects("destroy")
            .once()
            .withArgs(args[0]);

        leveldown.destroy(...args);
        ldmock.verify();
        assert.equal(1, expect.getCall(0).args.length);
    });

    it("repair() substitutes missing callback argument", () => {
        const ldmock = mock(leveldown);
        const args = ["location"];
        const expect = ldmock
            .expects("repair")
            .once()
            .withArgs(args[0]);

        leveldown.repair(...args);
        ldmock.verify();
        assert.equal(1, expect.getCall(0).args.length);
    });
});
