const {
    application: { Subsystem },
    x
} = adone;

describe("application", "Subsystem", () => {
    const create = (name) => new Subsystem({ name });
    it("default initialization", () => {
        const ss = create();
        assert.undefined(ss.name);
    });

    it("initialization with name", () => {
        const ss = create("super");
        assert.equal(ss.name, "super");
    });

    it("should throw on changing name", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.name = "dd";
        }, x.NotAllowed);
    });

    it("should throw on changing parent", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.parent = new Subsystem();
        }, x.NotAllowed);
    });

    it("should throw on changing state", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.state = adone.application.STATE.RUNNING;
        }, x.NotAllowed);
    });

    it("should throw on changing root", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.root = new Subsystem();
        }, x.NotAllowed);
    });
});
