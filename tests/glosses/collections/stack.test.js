describe("collections", "Stack", () => {
    it("should work as expected", () => {
        const s = new adone.collection.Stack();
        s.push(1);
        s.push(2);
        s.push(3);
        expect(s.pop()).to.be.equal(3);
        expect(s.pop()).to.be.equal(2);
        expect(s.pop()).to.be.equal(1);
    });

    it("push() should return the length", () => {
        const s = new adone.collection.Stack();

        expect(s.push(1)).to.be.equal(1);
        expect(s.push(1)).to.be.equal(2);
        expect(s.push(1)).to.be.equal(3);
        expect(s.push(1)).to.be.equal(4);
        s.pop();
        expect(s.push(1)).to.be.equal(4);
    });

    it("length should be the actual length", () => {
        const s = new adone.collection.Stack();
        expect(s.length).to.be.equal(0);
        s.push(1);
        s.push(1);
        expect(s.length).to.be.equal(2);
        s.pop();
        expect(s.length).to.be.equal(1);
        s.pop();
        expect(s.length).to.be.equal(0);
    });

    it("empty() should be the indicator of the emptiness of a stack", () => {
        const s = new adone.collection.Stack();

        expect(s.empty).to.be.true;
        s.push(1);
        expect(s.empty).to.be.false;
        s.pop();
        expect(s.empty).to.be.true;
    });

    it("top() should return the element at the top of a stack but doesnt remove it", () => {
        const s = new adone.collection.Stack();
        s.push(1);
        expect(s.top).to.be.equal(1);
        expect(s.empty).to.be.false;
        expect(s.length).to.be.equal(1);
    });

    it("extend() should push all the items from an iterable into a stack", () => {
        const s = new adone.collection.Stack();
        s.extend([1, 2, 3, 4, 5]);
        expect(s.pop()).to.be.equal(5);
        expect(s.pop()).to.be.equal(4);
        expect(s.pop()).to.be.equal(3);
        expect(s.pop()).to.be.equal(2);
        expect(s.pop()).to.be.equal(1);
    });

    it("constructor() should call extend with the first argument", () => {
        const s = new adone.collection.Stack([1, 2, 3, 4, 5]);
        expect(s.pop()).to.be.equal(5);
        expect(s.pop()).to.be.equal(4);
        expect(s.pop()).to.be.equal(3);
        expect(s.pop()).to.be.equal(2);
        expect(s.pop()).to.be.equal(1);
    });

    it("should iterate through a stack", () => {
        const s = new adone.collection.Stack([1, 2, 3, 4, 5]);
        let i = 5;
        for (const t of s) {
            expect(t).to.be.equal(i--);
        }
        expect(i).to.be.equal(0);
    });
});
