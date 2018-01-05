/*eslint no-undef: 0*/
describe("first", () => {
    before(() => {
        global.a = 5;
    });

    it("a = 5 and b is not present", () => {
        assert.equal(global.a, 5);
        assert.equal(global.b, undefined);
    });
});
