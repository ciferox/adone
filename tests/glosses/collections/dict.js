function shouldHaveTheUsualContent(dict) {
    expect(dict.has("a")).to.be.true;
    expect(dict.has("b")).to.be.true;
    expect(dict.has("c")).to.be.false;
    expect(dict.has("__proto__")).to.be.false;
    expect(dict.has("hasOwnProperty")).to.be.false;

    expect(dict.get("a")).to.be.eql(10);
    expect(dict.get("b")).to.be.eql(20);
    expect(dict.get("c")).to.be.eql(undefined);

    const mapIter = dict.keys();
    let key;
    const keys = [];
    while (key = mapIter.next().value) {
        keys.push(key);
    }
    expect(dict.keysArray()).to.be.eql(["a", "b"]);

    expect(dict.valuesArray()).to.be.eql([10, 20]);
    expect(dict.entriesArray()).to.be.eql([["a", 10], ["b", 20]]);
    expect(dict.reduce(function (basis, value, key) {
        return basis + value;
    }, 0)).to.be.eql(30);
    expect(dict.reduce(function (basis, value, key) {
        basis.push(key);
        return basis;
    }, [])).to.be.eql(["a", "b"]);
    expect(dict.length).to.be.eql(2);
}


module.exports = function describeDict(Dict) {

    it("should be constructable from entry duples", function () {
        const dict = new Dict([["a", 10], ["b", 20]]);
        shouldHaveTheUsualContent(dict);
    });

    it("should be constructable from objects", function () {
        const dict = Dict.from({ a: 10, b: 20 });
        shouldHaveTheUsualContent(dict);
    });

    it("should be constructable from dicts", function () {
        const dict = new Dict(Dict.from({ a: 10, b: 20 }));
        shouldHaveTheUsualContent(dict);
    });

    describe("delete", function () {
        it("should be able to delete keys", function () {
            const dict = Dict.from({ a: 10, b: 20, c: 30 });
            expect(dict.delete("c")).to.be.true;
            expect(dict.delete("c")).to.be.false;
            shouldHaveTheUsualContent(dict);
        });
    });

    it("should be able to contain hasOwnProperty", function () {
        const dict = new Dict();
        dict.set("hasOwnProperty", 10);
        expect(dict.get("hasOwnProperty")).to.be.eql(10);
        expect(dict.delete("hasOwnProperty")).to.be.true;
        expect(dict.length).to.be.eql(0);
        expect(dict.delete("hasOwnProperty")).to.be.false;
    });

    it("should be able to contain __proto__", function () {
        const dict = new Dict();
        dict.set("__proto__", 10);
        expect(dict.get("__proto__")).to.be.eql(10);
        expect(dict.delete("__proto__")).to.be.true;
        expect(dict.length).to.be.eql(0);
        expect(dict.delete("__proto__")).to.be.false;
    });
};