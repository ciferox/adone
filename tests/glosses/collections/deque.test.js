const { Deque } = adone.collection;
const describeDeque = require("./deque");
const describeOrder = require("./order");
const describeToJson = require("./to_json");

describe("Deque", function () {
    it("just the facts", function () {
        const deque = new Deque();
        expect(deque.length).to.be.equal(0);
        expect(deque.capacity).to.be.equal(16);

        deque.push(10);
        expect(deque.length).to.be.equal(1);
        expect(deque.shift()).to.be.equal(10);
        expect(deque.length).to.be.equal(0);

        deque.push(20);
        expect(deque.length).to.be.equal(1);
        deque.push(30);
        expect(deque.length).to.be.equal(2);
        expect(deque.shift()).to.be.equal(20);
        expect(deque.length).to.be.equal(1);
        expect(deque.shift()).to.be.equal(30);
        expect(deque.length).to.be.equal(0);

        expect(deque.capacity).to.be.equal(16);

    });

    it("grows", function () {
        const deque = new Deque();

        for (var i = 0; i < 16; i++) {
            expect(deque.length).to.be.equal(i);
            deque.push(i);
            expect(deque.capacity).to.be.equal(16);
        }
        deque.push(i);
        expect(deque.capacity).to.be.equal(64);
    });

    it("initializes", function () {
        const deque = new Deque([1, 2, 3]);
        expect(deque.length).to.be.equal(3);
        expect(deque.shift()).to.be.equal(1);
        expect(deque.shift()).to.be.equal(2);
        expect(deque.shift()).to.be.equal(3);
    });

    it("does not get in a funk", function () {
        const deque = new Deque();
        expect(deque.shift()).to.be.undefined;
        deque.push(4);
        expect(deque.shift()).to.be.equal(4);
    });

    // it("dispatches range changes", function () {
    //     var spy = jasmine.createSpy();
    //     var handler = function (plus, minus, value) {
    //         spy(plus, minus, value); // ignore last arg
    //     };
    //     var deque = Deque();
    //     deque.addRangeChangeListener(handler);
    //     deque.push(1);
    //     deque.push(2, 3);
    //     deque.pop();
    //     deque.shift();
    //     deque.unshift(4, 5);
    //     deque.removeRangeChangeListener(handler);
    //     deque.shift();
    //     expect(spy.argsForCall).toEqual([
    //         [[1], [], 0],
    //         [[2, 3], [], 1],
    //         [[], [3], 2],
    //         [[], [1], 0],
    //         [[4, 5], [], 0]
    //     ]);
    // });

    // from https://github.com/petkaantonov/deque

    describe("get", function () {
        it("should return undefined on nonsensical argument", function () {
            const a = new Deque([1, 2, 3, 4]);
            expect(a.get(-5)).to.be.equal(void 0);
            expect(a.get(-100)).to.be.equal(void 0);
            expect(a.get(void 0)).to.be.equal(void 0);
            expect(a.get("1")).to.be.equal(void 0);
            expect(a.get(NaN)).to.be.equal(void 0);
            expect(a.get(Infinity)).to.be.equal(void 0);
            expect(a.get(-Infinity)).to.be.equal(void 0);
            expect(a.get(1.5)).to.be.equal(void 0);
            expect(a.get(4)).to.be.equal(void 0);
        });


        it("should support positive indexing", function () {
            const a = new Deque([1, 2, 3, 4]);
            expect(a.get(0)).to.be.equal(1);
            expect(a.get(1)).to.be.equal(2);
            expect(a.get(2)).to.be.equal(3);
            expect(a.get(3)).to.be.equal(4);
        });

        it("should support negative indexing", function () {
            const a = new Deque([1, 2, 3, 4]);
            expect(a.get(-1)).to.be.equal(4);
            expect(a.get(-2)).to.be.equal(3);
            expect(a.get(-3)).to.be.equal(2);
            expect(a.get(-4)).to.be.equal(1);
        });
    });

    describeDeque(Deque);
    describeOrder(Deque);
    describeToJson(Deque, [1, 2, 3, 4]);

});

