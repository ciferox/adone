describe("options override", function () {
    const {
        FormData
    } = this;

    it("should work", () => {
        const form = new FormData({ maxDataSize: 20 * 1024 * 1024 });
        assert.strictEqual(form.maxDataSize, 20 * 1024 * 1024);
    });
});
