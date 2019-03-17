const {
    multiformat: { CID },
    ipfs: { Block }
} = adone;

describe("ipfs", "block", () => {
    it("create throws", () => {
        expect(
            () => new Block("string")
        ).to.throw();

        expect(
            () => new Block(Buffer.from("hello"), "cid")
        ).to.throw();

        expect(
            () => new Block("hello", new CID("QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n"))
        ).to.throw();
    });

    it("create", () => {
        const b = new Block(Buffer.from("hello"), new CID("QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n"));

        expect(Block.isBlock(b)).to.eql(true);
    });

    it("block stays immutable", () => {
        const b = new Block(Buffer.from("hello"), new CID("QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n"));

        expect(
            () => {
                b.data = "fail";
            }
        ).to.throw(
            /immutable/
        );

        expect(
            () => {
                b.cid = "fail";
            }
        ).to.throw(
            /immutable/
        );
    });
});
