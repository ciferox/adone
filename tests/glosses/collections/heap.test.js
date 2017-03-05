const { Heap } = adone.collection;
const permute = require("./permute");
const describeToJson = require("./to_json");

describe("Heap", function () {

    describeToJson(Heap, [4, 3, 2, 1]);

    describe("always tracks the max value", function () {

        const commonNumbers = [1, 2, 3, 4, 5];
        permute(commonNumbers).forEach(function (numbers) {
            it(JSON.stringify(numbers), function () {

                const heap = new Heap(numbers);
                const maxes = commonNumbers.slice();

                while (maxes.length > 0) {
                    const max = maxes.pop();
                    const top = heap.pop();
                    expect(top).to.be.eql(max);
                    expect(heap.length).to.be.equal(maxes.length);
                }

                expect(heap.length).to.be.equal(0);

            });
        });

        it("[5, 4, 3, 2, 1]", function () {
            const stack = [5, 4, 3, 2, 1];
            const heap = new Heap(stack);
            expect(heap.content).to.be.eql([5, 4, 3, 2, 1]);
            expect(heap.length).to.be.equal(5);
            expect(heap.pop()).to.be.equal(5);
            expect(heap.content).to.be.eql([4, 2, 3, 1]);
            expect(heap.length).to.be.equal(4);
            expect(heap.pop()).to.be.equal(4);
            expect(heap.content).to.be.eql([3, 2, 1]);
            expect(heap.length).to.be.equal(3);
            expect(heap.pop()).to.be.equal(3);
            expect(heap.content).to.be.eql([2, 1]);
            expect(heap.length).to.be.equal(2);
            expect(heap.pop()).to.be.equal(2);
            expect(heap.content).to.be.eql([1]);
            expect(heap.length).to.be.equal(1);
            expect(heap.pop()).to.be.equal(1);
            expect(heap.content).to.be.eql([]);
            expect(heap.length).to.be.equal(0);
        });

    });

    it("should delete properly", function () {

        const heap = new Heap([1, 2, 3, 4, 5, 6]);
        expect(heap.length).to.be.eql(6);
        heap.delete(3);
        expect(heap.sorted()).to.be.eql([1, 2, 4, 5, 6]);
        expect(heap.length).to.be.eql(5);
        heap.delete(6);
        expect(heap.sorted()).to.be.eql([1, 2, 4, 5]);
        expect(heap.length).to.be.eql(4);
        heap.delete(1);
        expect(heap.sorted()).to.be.eql([2, 4, 5]);
        expect(heap.length).to.be.eql(3);
        heap.delete(4);
        expect(heap.sorted()).to.be.eql([2, 5]);
        expect(heap.length).to.be.eql(2);
        heap.delete(2);
        expect(heap.sorted()).to.be.eql([5]);
        expect(heap.length).to.be.eql(1);
        heap.delete(5);
        expect(heap.sorted()).to.be.eql([]);
        expect(heap.length).to.be.eql(0);
        expect(heap.delete(null)).to.be.equal(false);
        expect(heap.sorted()).to.be.eql([]);
        expect(heap.length).to.be.eql(0);

    });

});
