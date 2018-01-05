/*eslint no-undef:0*/
describe("first", () => {
    before(() => {
        global.b = 5;
    });

    it("b = 5 and a is not present", () => {
        assert.equal(global.b, 5);
        assert.equal(global.a, undefined);
    });
});
