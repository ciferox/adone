const PouchDB = adone.database.pouch.coverage.DB;
const clone = PouchDB.utils.clone;

describe("test.clone.js", () => {

    it("Clones regular objects", () => {
        const obj1 = { foo: "bar" };
        const obj2 = clone(obj1);
        obj1.baz = "quuz";
        assert.isUndefined(obj2.baz);
    });

    it("Doesn't clone fancy objects", () => {

        function Kitty() {
        }

        Kitty.prototype.meow = function () {
            return "meow";
        };

        const obj1 = { kitty: new Kitty() };
        const obj2 = clone(obj1);
        assert.equal(obj1.kitty.meow(), "meow");
        assert.equal(obj2.kitty.meow(), "meow");
        obj1.kitty.foo = "bar";
        assert.equal(obj2.kitty.foo, "bar");
    });
});
