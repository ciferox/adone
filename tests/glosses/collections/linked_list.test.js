describe("LinkedList", () => {
    const { LinkedList } = adone.collection;
    const empty = Symbol.for("linkedlist:empty");

    function rolling(list, expected) {
        const n = list.maxLength * 2;
        const m = expected.length;
        let cursor = list.head;
        for (let i = 0; i < n; ++i) {
            expect(cursor.value).to.be.equal(expected[i % m], `next iteration ${i} failed`);
            cursor = cursor.next;
        }
        cursor = list.head.prev;
        for (let i = n - 1; i >= 0; --i) {
            expect(cursor.value).to.be.equal(expected[i % m], `prev iteration ${i} failed`);
            cursor = cursor.prev;
        }
    }

    it("should create a list of fixed size", () => {
        const list = new LinkedList(10);

        let cursor = list.head;
        for (let i = 0; i < 10; ++i) {
            cursor = cursor.next;
        }
        expect(cursor).to.be.equal(list.head, "incorrect next links connection");
        cursor = list.tail;
        for (let i = 0; i < 10; ++i) {
            cursor = cursor.prev;
        }
        expect(cursor).to.be.equal(list.tail, "incorrect prev links connection");
        expect(list.head.prev).to.be.equal(list.tail, "the tail is not the prev of the head");
        expect(list.maxLength).to.be.equal(10);
    });

    describe("push", () => {
        it("should push a value", () => {
            const list = new LinkedList(5);
            list.push(1);
            rolling(list, [1, empty, empty, empty, empty]);
        });

        it("should return a node", () => {
            const list = new LinkedList(10);
            let n = list.push(1);
            expect(n).to.be.equal(list.head);
            n = list.push(2);
            expect(n).to.be.equal(list.tail);
            expect(n).to.be.equal(list.head.next);
        });

        it("should prevent push into a full list", () => {
            const list = new LinkedList(10);
            for (let i = 0; i < 10; ++i) {
                list.push(1);
            }
            expect(() => list.push(1)).to.throw(adone.x.Exception, "Full");
        });
    });

    describe("pop", () => {
        it("should pop a value", () => {
            const list = new LinkedList(5);
            list.push(1);
            const val = list.pop();
            expect(val).to.be.equal(1, "got incorrect value");
            rolling(list, [empty, empty, empty, empty, empty]);
        });

        it("should return undefined if the the list is empty", () => {
            const list = new LinkedList(10);
            expect(list.pop()).to.be.undefined;
        });
    });

    it("the length should be zero", () => {
        const list = new LinkedList(10);
        expect(list.length).to.be.equal(0, "in the beginning the length should be zero");
    });

    it("should change the length", () => {
        const list = new LinkedList(10);
        list.push(1);
        expect(list.length).to.be.equal(1, "after push the length is still 0");
        list.pop();
        expect(list.length).to.be.equal(0, "pop didnt change the length");
    });

    it("should indicate the emptiness of a list", () => {
        const list = new LinkedList(10);
        expect(list.empty).to.be.true;
        list.push(1);
        expect(list.empty).to.be.false;
        list.pop(1);
        expect(list.empty).to.be.true;
    });

    it("should indicate the fullness of a list", () => {
        const list = new LinkedList(10);
        expect(list.full).to.be.false;
        for (let i = 0; i < 10; ++i) {
            list.push(1);
        }
        expect(list.full).to.be.true;
        list.pop();
        expect(list.full).to.be.false;
    });

    describe("shift", () => {
        it("should shift", () => {
            const list = new LinkedList(5);
            list.push(1); 
            list.push(2); 
            list.push(3); 
            list.push(4);
            expect(list.shift()).to.be.equal(1);
            expect(list.length).to.be.equal(3);
            rolling(list, [2, 3, 4, empty, empty]); 
        });

        it("should return undefined if the list is empty", () => {
            const list = new LinkedList(10);
            expect(list.shift()).to.be.undefined;
        });
    });

    describe("unshift", () => {
        it("should unshift", () => {
            const list = new LinkedList(5);
            list.push(1);
            list.push(2);
            list.unshift(0);
            expect(list.length).to.be.equal(3);
            rolling(list, [0, 1, 2, empty, empty]);
        });

        it("should unshift into an empty list", () => {
            const list = new LinkedList(5);
            list.unshift(0);
            expect(list.length).to.be.equal(1);
            rolling(list, [0, empty, empty, empty, empty]);
        });

        it("should prevent unshifting into a full list", () => {
            const list = new LinkedList(10);
            for (let i = 0; i < 10; ++i) {
                list.push(1);
            }
            expect(() => list.unshift(0)).to.throw(adone.x.Exception, "Full");
        });
    });

    describe("pushNode", () => {
        it("should move a node to the tail", () => {
            const list = new LinkedList(5);
            list.push(1);
            const n = list.push(2);
            list.push(3);
            list.push(4);
            list.pushNode(n);
            expect(list.length).to.be.equal(4);
            rolling(list, [1, 3, 4, 2, empty]);
        });

        it("should be correct if the head is moved", () => {
            const list = new LinkedList(5);
            const n = list.push(1);
            list.push(2); 
            list.push(3); 
            list.pushNode(n);
            expect(list.length).to.be.equal(3);
            rolling(list, [2, 3, 1, empty, empty]); 
        });

        it("should be correct if the tail is moved", () => {
            const list = new LinkedList(5);
            list.push(1);
            list.push(2);
            const n = list.push(3);
            list.pushNode(n);
            expect(list.length).to.be.equal(3);
            rolling(list, [1, 2, 3, empty, empty]);
        });
    });

    describe("unshiftNode", () => {
        it("should move a node to the head", () => {
            const list = new LinkedList(5);
            list.push(1);
            const n = list.push(2);
            list.push(3);
            list.unshiftNode(n);
            expect(list.length).to.be.equal(3);
            rolling(list, [2, 1, 3, empty, empty]);
        });

        it("should be correct if the head is moved", () => {
            const list = new LinkedList(5);
            const n = list.push(1);
            list.push(2);
            list.push(3);
            list.unshiftNode(n);
            expect(list.length).to.be.equal(3);
            rolling(list, [1, 2, 3, empty, empty]); 
        });

        it("should be correct if the tail is moved", () => {
            const list = new LinkedList(5);
            list.push(1);
            list.push(2);
            const n = list.push(3);
            list.unshiftNode(n);
            expect(list.length).to.be.equal(3);
            rolling(list, [3, 1, 2, empty, empty]); 
        });
    });

    describe("removeNode", () => {
        it("should remove a node", () => {
            const list = new LinkedList(5);
            list.push(1);
            const n = list.push(2);
            list.push(3);
            list.removeNode(n);
            expect(list.length).to.be.equal(2);
            rolling(list, [1, 3, empty, empty, empty]); 
        });

        it("should be correct if the head is removed", () => {
            const list = new LinkedList(5);
            const n = list.push(1);
            list.push(2);
            list.push(3);
            list.removeNode(n);
            expect(list.length).to.be.equal(2);
            rolling(list, [2, 3, empty, empty, empty]); 
        });

        it("should be correct if the tail is removed", () => {
            const list = new LinkedList(5);
            list.push(1);
            list.push(2);
            const n = list.push(3);
            list.removeNode(n);
            expect(list.length).to.be.equal(2);
            rolling(list, [1, 2, empty, empty, empty]);
        });
    });

    describe("clear", () => {
        it("should clear a list, but keeping the old values", () => {
            const list = new LinkedList(5);
            list.push(1);
            list.push(2);
            list.push(3);
            list.clear();
            expect(list.length).to.be.equal(0);
            expect(list.head).to.be.equal(list.tail.next);
            expect(list.head.prev).to.be.equal(list.tail);
            rolling(list, [1, 2, 3, empty, empty]);
        });

        it("should clear a list and pop all the values", () => {
            const list = new LinkedList(5);
            list.push(1); 
            list.push(2); 
            list.push(3);
            list.clear(true);
            expect(list.length).to.be.equal(0);
            expect(list.head).to.be.equal(list.tail.next);
            expect(list.head.prev).to.be.equal(list.tail);
            rolling(list, [empty, empty, empty, empty, empty]); 
        });
    });

    it("should return an array from a list", () => {
        const list = new LinkedList(5);
        let a = list.toArray();
        expect(a).to.be.an("Array");
        expect(a).to.be.empty;
        list.push(1);
        list.push(2);
        list.push(3);
        expect(a).to.be.empty;
        a = list.toArray();
        expect(a).to.be.an("Array");
        expect(a).to.be.deep.equal([1, 2, 3]);
    });

    it("should provide an iterator", () => {
        const list = new LinkedList(5);
        expect(list[Symbol.iterator]).to.be.a("function");
        for (const a of list) {
            throw new Error("it should be empty");
        }
        list.push(1);
        for (const a of list) {
            expect(a).to.be.equal(1);
        }
        list.push(2);
        const expected = [1, 2];
        for (const a of list) {
            expect(a).to.be.equal(expected.shift());
        }
    });

    describe("resizing", () => {
        it("should resize a list", () => {
            const list = new LinkedList(5);
            list.push(1);
            list.push(2);
            list.push(3);
            list.resize(8);
            expect(list.length).to.be.equal(3);
            expect(list.maxLength).to.be.equal(8);
            rolling(list, [1, 2, 3, empty, empty, empty, empty, empty]);
        });

        it("should work if the size is lower than the max but greater than the length", () => {
            const list = new LinkedList(5);
            list.push(1);
            list.push(2);
            list.push(3);
            list.resize(4);
            expect(list.length).to.be.equal(3);
            expect(list.maxLength).to.be.equal(4);
            rolling(list, [1, 2, 3, empty]); 
        });

        it("should work if the size is lower than the max and lower than the length", () => {
            const list = new LinkedList(5);
            list.push(1);
            list.push(2);
            list.push(3);
            expect(list.length).to.be.equal(3);
            list.resize(2);
            expect(list.length).to.be.equal(2);
            expect(list.maxLength).to.be.equal(2);
            rolling(list, [1, 2]);
        });

        it("should work if the size is lower than the max and equal to the length", () => {
            const list = new LinkedList(5);
            list.push(1);
            list.push(2);
            list.push(3);
            list.resize(3);
            expect(list.length).to.be.equal(3);
            expect(list.maxLength).to.be.equal(3);
            rolling(list, [1, 2, 3]);
        });

        it("should work if actually there is no resizing", () => {
            const list = new LinkedList(5);
            list.push(1); 
            list.push(2); 
            list.push(3);
            list.resize(5); 
            expect(list.length).to.be.equal(3);
            expect(list.maxLength).to.be.equal(5);
            rolling(list, [1, 2, 3, empty, empty]);
        });

        it("should do autoresizing if the size is not provided", () => {
            const list = new LinkedList();
            expect(list.maxLength).to.be.equal(16);  // the default value
            for (let i = 0; i < 16; ++i) {
                list.push(i);
            }
            expect(list.full).to.be.true;
            list.push(16);
            expect(list.length).to.be.equal(17);
            expect(list.maxLength).to.be.equal(32);  // x2
            rolling(list, [...new Array(list.maxLength)].map((_, i) => i > 16 ? empty : i));
            for (let i = 0; i < 15; ++i) {
                list.push(17 + i);
            }
            expect(list.full).to.be.true;
            list.push(32);
            expect(list.length).to.be.equal(33);
            expect(list.maxLength).to.be.equal(64);  // x2
            rolling(list, [...new Array(list.maxLength)].map((_, i) => i > 32 ? empty : i));
        });
    });

    describe("front", () => {
        it("should get the head", () => {
            const list = new LinkedList();
            list.push(1);
            expect(list.front).to.be.equal(1);
            list.push(2);
            expect(list.front).to.be.equal(1); 
        });

        it("should throw an error if the list is empty", () => {
            const list = new LinkedList();
            expect(() => list.front).to.throw();
        });
    });

    describe("back", () => {
        it("should get the last element", () => {
            const list = new LinkedList();
            list.push(1);
            expect(list.back).to.be.equal(1);
            list.push(2);
            expect(list.back).to.be.equal(2); 
        });

        it("should throw an error if the list is empty", () => {
            const list = new LinkedList();
            expect(() => list.back).to.throw();
        });
    });

    describe.only("nextNode", () => {
        it("should return the next node", () => {
            const list = new LinkedList();
            const a = list.push(1);
            const b = list.push(2);
            const c = list.push(3);
            expect(list.nextNode(a)).to.be.equal(b);
            expect(list.nextNode(b)).to.be.equal(c);
        });

        it("should return the first node without any argument", () => {
            const list = new LinkedList();
            const a = list.push(1);
            expect(list.nextNode()).to.be.equal(a);
        });

        it("should return null if this is the end", () => {
            const list = new LinkedList();
            const a = list.push(1);
            const b = list.push(2);
            expect(list.nextNode(b)).to.be.null;
        });

        it("should return null there are no elements", () => {
            const list = new LinkedList();
            expect(list.nextNode()).to.be.null;
        });
    });
});
