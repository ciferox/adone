const { Set } = adone.collection;
const describeCollection = require("./collection");
const describeSet = require("./set");

describe("Set", function () {
    describeCollection(Set, [1, 2, 3, 4], true);
    describeCollection(Set, [{id: 0}, {id: 1}, {id: 2}, {id: 3}], true);
    describeSet(Set);

    it("should pop and shift", function () {
        const a = {i: 2};
        const b = {i: 1};
        const c = {i: 0};
        const set = new Set([a, b, c], Object.is);
        expect(set.pop()).to.be.equal(c);
        expect(set.shift()).to.be.equal(a);
    });
});
