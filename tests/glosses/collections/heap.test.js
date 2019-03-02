const {
    collection: { Heap }
} = adone;

const { random } = Math;

describe("colletion", "Heap", () => {
    describe("push, pop", () => {
        it("should sort an array using push and pop", () => {
            const heap = new Heap();
            for (let i = 1; i <= 10; i++) {
                heap.push(random());
            }
            const sorted = ((() => {
                const result = [];
                while (!heap.empty()) {
                    result.push(heap.pop());
                }
                return result;
            })());
            assert.deepEqual(sorted.slice().sort(), sorted);
        });

        it("should work with custom comparison function", () => {
            const cmp = function (a, b) {
                if (a > b) {
                    return -1;
                }
                if (a < b) {
                    return 1;
                }
                return 0;
            };
            const heap = new Heap(cmp);
            for (let i = 1; i <= 10; i++) {
                heap.push(random());
            }
            const sorted = ((() => {
                const result = [];
                while (!heap.empty()) {
                    result.push(heap.pop());
                }
                return result;
            })());
            assert.deepEqual(sorted.slice().sort().reverse(), sorted);
        });
    });

    describe("replace", () =>
        it("should behave like pop() followed by push()", () => {
            const heap = new Heap();
            for (let v = 1; v <= 5; v++) {
                heap.push(v);
            }
            assert.equal(heap.replace(3), 1);
            assert.deepEqual(heap.toArray().sort(), [2, 3, 3, 4, 5]);
        })
    );

    describe("pushpop", () =>
        it("should behave like push() followed by pop()", () => {
            const heap = new Heap();
            for (let v = 1; v <= 5; v++) {
                heap.push(v);
            }
            assert.equal(heap.pushpop(6), 1);
            assert.deepEqual(heap.toArray().sort(), [2, 3, 4, 5, 6]);
        })
    );

    describe("contains", () =>
        it("should return whether it contains the value", () => {
            let v;
            const heap = new Heap();
            for (v = 1; v <= 5; v++) {
                heap.push(v);
            }
            for (v = 1; v <= 5; v++) {
                assert.isTrue(heap.contains(v));
            }
            assert.isFalse(heap.contains(0));
            assert.isFalse(heap.contains(6));
        })
    );

    describe("peek", () =>
        it("should return the top value", () => {
            const heap = new Heap();
            heap.push(1);
            assert.equal(heap.peek(), 1);
            heap.push(2);
            assert.equal(heap.peek(), 1);
            heap.pop();
            assert.equal(heap.peek(), 2);
        })
    );

    describe("clone", () =>
        it("should return a cloned heap", () => {
            const a = new Heap();
            for (let v = 1; v <= 5; v++) {
                a.push(v);
            }
            const b = a.clone();
            assert.deepEqual(a.toArray(), b.toArray());
        })
    );

    describe("Heap.nsmallest", () => {
        it("should return exactly n elements when size() >= n", () => {
            assert.deepEqual(Heap.nsmallest([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3), [1, 2, 3]);

            const array = [1, 3, 2, 1, 3, 4, 4, 2, 3, 4, 5, 1, 2, 3, 4, 5, 2, 1, 3, 4, 5, 6, 7, 2];
            assert.deepEqual(Heap.nsmallest(array, 2), [1, 1]);
        });

        it("should return size() elements when size() <= n", () => {
            assert.deepEqual(Heap.nsmallest([3, 2, 1], 10), [1, 2, 3]);
        });
    });

    describe("Heap.nlargest", () => {
        it("should return exactly n elements when size() >= n", () => {
            assert.deepEqual(Heap.nlargest([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3), [10, 9, 8]);
        });

        it("should return size() elements when size() <= n", () => {
            assert.deepEqual(Heap.nlargest([3, 2, 1], 10), [3, 2, 1]);
        });
    });

    describe("updateItem", () => {
        it("should return correct order", () => {
            const a = { x: 1 };
            const b = { x: 2 };
            const c = { x: 3 };
            const h = new Heap(((m, n) => {
                return m.x - n.x;
            }));
            h.push(a);
            h.push(b);
            h.push(c);
            c.x = 0;
            h.updateItem(c);
            assert.deepEqual(h.pop(), c);
        });
        
        it.skip("should return correct order when used statically", () => {
            const a = { x: 1 };
            const b = { x: 2 };
            const c = { x: 3 };
            const h = [];
            const cmp = (m, n) => m.x - n.x;
            Heap.push(h, a, cmp);
            Heap.push(h, b, cmp);
            Heap.push(h, c, cmp);
            c.x = 0;
            Heap.updateItem(h, c, cmp);
            assert.deepEqual(Heap.pop(h, cmp), c);
        });
    });
});
