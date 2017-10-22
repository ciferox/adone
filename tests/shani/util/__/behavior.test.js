describe("shani", "util", "__", "behavior", () => {
    const { stub: createStub, __: { behavior } } = adone.shani.util;

    it("adds and uses a custom behavior", () => {
        behavior.addBehavior(createStub, "returnsNum", (fake, n) => {
            fake.returns(n);
        });

        const stub = createStub().returnsNum(42);

        assert.equal(stub(), 42);
    });
});
