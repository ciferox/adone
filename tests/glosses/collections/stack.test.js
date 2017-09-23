describe("collection", "Stack", () => {
    const { collection: { Stack } } = adone;

    it("should work as expected", () => {
        const s = new Stack();
        s.push(1);
        s.push(2);
        s.push(3);
        expect(s.pop()).to.be.equal(3);
        expect(s.pop()).to.be.equal(2);
        expect(s.pop()).to.be.equal(1);
    });

    it("length should be the actual length", () => {
        const s = new Stack();
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
        const s = new Stack();

        expect(s.empty).to.be.true;
        s.push(1);
        expect(s.empty).to.be.false;
        s.pop();
        expect(s.empty).to.be.true;
    });

    it("top() should return the element at the top of a stack but doesnt remove it", () => {
        const s = new Stack();
        s.push(1);
        expect(s.top).to.be.equal(1);
        expect(s.empty).to.be.false;
        expect(s.length).to.be.equal(1);
    });

    it("should create from an iterable", () => {
        const s = Stack.from(function* () {
            yield* [1, 2, 3, 4, 5];
        }());
        expect(s.pop()).to.be.equal(5);
        expect(s.pop()).to.be.equal(4);
        expect(s.pop()).to.be.equal(3);
        expect(s.pop()).to.be.equal(2);
        expect(s.pop()).to.be.equal(1);
    });

    it("should iterate through a stack", () => {
        const s = Stack.from([1, 2, 3, 4, 5]);
        let i = 5;
        for (const t of s) {
            expect(t).to.be.equal(i--);
        }
        expect(i).to.be.equal(0);
    });
});
