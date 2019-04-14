const {
    is,
    util: { mockInstance }
} = adone;

describe("util", "mockInstance", () => {
    it("mock plain object", () => {
        const obj = {
            val: 8,
            setVal(val) {
                this.val = val;
            },
            getVal() {
                return this.val;
            }
        };

        const mock = mockInstance(obj);

        assert.sameMembers(Object.getOwnPropertyNames(mock), ["val", "setVal", "getVal"]);
        assert.equal(mock.val, 8);
        mock.val = 10;
        assert.equal(mock.val, 10);
        mock.setVal(8);
        assert.equal(mock.getVal(), 8);
    });

    it("mock instance of class", () => {
        class Private {
            #d = false;
            #_dsfsd = new Date();

            constructor() {
                this.a = "a";

                Object.defineProperty(this, "b", {
                    value: 8
                });
            }

            get d() {
                return this.#d;
            }

            set d(val) {
                this.#d = val;
            }

            getA() {
                return this.a;
            }

            setA(val) {
                this.a = val;
            }

            #privateMethod() {
                return false;
            }
        }
        Private.prototype.c = 12;

        const instance = new Private();
        const mock = mockInstance(instance);

        assert.sameMembers(Object.getOwnPropertyNames(mock), ["a", "b", "c", "d", "getA", "setA"]);
        assert.equal(mock.a, "a");
        mock.a = "aa";
        assert.equal(mock.getA(), "aa");
        mock.setA("aaa");
        assert.equal(mock.a, "aaa");
        assert.equal(mock.b, 8);
        assert.throws(() => mock.b = 10, TypeError);
        assert.isFalse(is.propertyOwned(instance, "c"));
        assert.equal(mock.c, 12);
        mock.c = 10;
        assert.equal(mock.c, 10);
        assert.isFalse(is.propertyOwned(instance, "c"));
        assert.equal(mock.d, false);
        mock.d = true;
        assert.equal(mock.d, true);
    });
});
