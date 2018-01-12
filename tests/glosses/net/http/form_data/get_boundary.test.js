describe("getBoundary", function () {
    const {
        FormData
    } = this;

    it("works", () => {
        const form = new FormData();
        const boundary = form.getBoundary();

        assert.equal(boundary, form.getBoundary());
        assert.equal(boundary.length, 50);
    });

    it("should return different boundaries for different forms", () => {
        const formA = new FormData();
        const formB = new FormData();
        assert.notEqual(formA.getBoundary(), formB.getBoundary());
    });
});
