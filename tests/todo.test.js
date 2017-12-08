describe.todo("root", () => {
    it("a", () => {});

    it("b", () => {});

    it("c", () => {});

    describe("haha", () => {
        it("a", () => {});

        it.only("b", () => {});

        it("c", () => {});
    });
});
