describe("collection", "PriorityQueue", () => {
    const { collection: { PriorityQueue } } = adone;

    const reverseOrder = (a, b) => b - a;
    const directOrder = (a, b) => a - b;

    describe("clone", () => {
        it("should clone a queue", () => {
            const h1 = PriorityQueue.from([1, 2, 3, 4, 5]);
            const h2 = h1.clone();
            expect(h1.empty).to.be.false();
            const expected = [5, 4, 3, 2, 1];
            for (let i = 0; !h1.empty; ++i) {
                expect(h1.pop()).to.be.deep.equal(expected[i]);
            }
            for (let i = 0; !h2.empty; ++i) {
                expect(h2.pop()).to.be.deep.equal(expected[i]);
            }
        });
    });

    describe("toArray", () => {
        it("should convert a queue to an array", () => {
            const h1 = PriorityQueue.from([1, 2, 3, 4, 5]);
            expect(h1.toArray()).to.be.deep.equal([5, 4, 3, 2, 1]);
            expect(h1.pop()).to.be.equal(5);
        });
    });

    describe("getters", () => {
        it("should return the length", () => {
            const q = new PriorityQueue();
            expect(q.length).to.be.equal(0);
            q.push(1);
            expect(q.length).to.be.equal(1);
            q.push(1);
            expect(q.length).to.be.equal(2);
            q.pop();
            expect(q.length).to.be.equal(1);
            q.pop();
            expect(q.length).to.be.equal(0);
        });

        it("should return true if empty", () => {
            const q = new PriorityQueue();
            expect(q.empty).to.be.true();
            q.push(1);
            expect(q.empty).to.be.false();
            q.pop();
            expect(q.empty).to.be.true();
        });
    });

    it("should pop an element with the smallest priority", () => {
        const q = new PriorityQueue();
        const toPush = [1, 2, 3, 3, 4, 1, 11, 5, 9, 8, 10, -1];
        for (const i of toPush) {
            q.push(i);
        }
        expect(q.toArray()).to.be.deep.equal(toPush.sort(reverseOrder));
    });

    it("should support custom priority function", () => {
        const q = new PriorityQueue({
            priority: reverseOrder
        });
        const toPush = [1, 2, 3, 3, 4, 1, 11, 5, 9, 8, 10, -1];
        for (const i of toPush) {
            q.push(i);
        }
        expect(q.toArray()).to.be.deep.equal(toPush.sort(directOrder));
    });

    describe("delete", () => {
        it("should delete an arbitrary element", () => {
            const q = new PriorityQueue();
            const toPush = [1, 2, 3, 3, 4, 1, 11, 5, 9, 8, 10, -1];
            for (const i of toPush) {
                q.push(i);
            }
            q.delete(9);
            expect(q.toArray()).to.be.deep.equal(toPush.filter((x) => x !== 9).sort(reverseOrder));
        });

        it("should correctly work work the edge cases", () => {
            const q = new PriorityQueue();
            const toPush = [1, 2, 3, 3, 4, 1, 11, 5, 9, 8, 10, -1];
            for (const i of toPush) {
                q.push(i);
            }
            q.delete(11);
            q.delete(-1);
            expect(q.toArray()).to.be.deep.equal(toPush.filter((x) => x !== 11 && x !== -1).sort(reverseOrder));
        });
    });

    it("should support custom comparator for deletion", () => {
        const q = new PriorityQueue({
            priority: (a, b) => a.priority - b.priority,
            compare: (a, b) => a.value - b.value
        });
        const toPush = [1, 2, 3, 3, 4, 1, 11, 5, 9, 8, 10, -1, -10].map((x) => ({
            priority: 28 * x,
            value: x
        }));
        for (const i of toPush) {
            q.push(i);
        }
        q.delete({ value: -10 });
        expect(q.toArray()).to.be.deep.equal(toPush.filter((x) => x.value !== -10).sort((a, b) => reverseOrder(a.value, b.value)));
    });

    describe("replace", () => {
        it("should replace(pop + push) an element", () => {
            const q = new PriorityQueue();
            const toPush = [1, 2, 3, 3, 4, 1, 11, 5, 9, 8, 10, -1, -10];
            for (const i of toPush) {
                q.push(i);
            }
            q.replace(4); // 11 must be eliminated
            expect(q.toArray()).to.be.deep.equal(toPush.map((x) => x === 11 ? 4 : x).sort(reverseOrder));
        });
    });

    describe("pushpop", () => {
        it("should pushpop an element", () => {
            const q = new PriorityQueue();
            const toPush = [1, 2, 3, 3, 4, 1, 11, 5, 9, 8, 10, -1, -10];
            for (const i of toPush) {
                q.push(i);
            }
            expect(q.pushpop(4)).to.be.equal(11); // the same as replace, 11 should be eliminated
            expect(q.pushpop(100)).to.be.equal(100); // should change nothing
            expect(q.toArray()).to.be.deep.equal(toPush.map((x) => x === 11 ? 4 : x).sort(reverseOrder));
        });
    });

    describe("PriorityQueue.from", () => {
        it("should create a PriorityQueue from an iterable", () => {
            const toPush = [1, 2, 3, 3, 4, 1, 11, 5, 9, 8, 10, -1, -10];
            const q = PriorityQueue.from(function* () {
                yield* [1, 2, 3, 3, 4, 1, 11, 5, 9, 8, 10, -1, -10];
            }());
            expect(q).to.be.instanceOf(PriorityQueue);
            expect(q.toArray()).to.be.deep.equal(toPush.sort(reverseOrder));
        });

        it("should correctly work with derived classes", () => {
            class NewPriorityQueue extends PriorityQueue {
                secret() {
                    return 42;
                }
            }
            const q = NewPriorityQueue.from([1, 2, 3]);
            expect(q).to.be.instanceof(NewPriorityQueue);
            expect(q.secret()).to.be.equal(42);
            expect(q.toArray()).to.be.deep.equal([3, 2, 1]);
        });
    });
});
