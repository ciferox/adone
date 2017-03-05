require("../../../lib/glosses/collections/shim");

describe("Array", function () {
    describe("clone", function () {

        it("clones", function () {
            expect([1].clone()).to.be.eql([1]);
        });

        it("clones deeply", function () {
            const array = [[1], [2], [3], {
                a: 10,
                b: 20,
                c: [1, 2, 3]
            }];
            expect(array.clone()).to.be.eql(array);
        });

        it("clones cycles", function () {
            const array = [];
            array[0] = array;
            expect(array.clone()).to.be.eql(array);
        });

        it("clones sparse arrays", function () {
            expect([, ,].clone()).to.be.eql([, ,]);
        });

        it("clones sparse arrays quickly", function () {
            const start = Date.now();
            new Array(Math.pow(2, 30)).clone();
            expect(Date.now() - start < 100).to.be.true;
        });

        it("spliceOne remove", function () {
            const array = [1, 2, 3];
            array.spliceOne(1);
            expect(array).to.be.eql([1, 3]);
        });

        it("spliceOne add", function () {
            const array = [1, 2, 3];
            array.spliceOne(1, 2.5);
            expect(array).to.be.eql([1, 2.5, 3]);
        });
    });
});
