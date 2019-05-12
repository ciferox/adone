const {
    util: { splitArgs }
} = adone;

describe("util", "splitArgs", () => {
    it("should split double quoted string", () => {
        const i = " I  said 'I am sorry.', and he said \"it doesn't matter.\" ";
        const o = splitArgs(i);
        expect(7).to.be.equal(o.length);
        expect(o[0]).to.be.equal("I");
        expect(o[1]).to.be.equal("said");
        expect(o[2]).to.be.equal("I am sorry.,");
        expect(o[3]).to.be.equal("and");
        expect(o[4]).to.be.equal("he");
        expect(o[5]).to.be.equal("said");
        expect(o[6]).to.be.equal("it doesn't matter.");
    });

    it("should split pure double quoted string", () => {
        const i = "I said \"I am sorry.\", and he said \"it doesn't matter.\"";
        const o = splitArgs(i);
        expect(o.length).to.be.equal(7);
        expect(o[0]).to.be.equal("I");
        expect(o[1]).to.be.equal("said");
        expect(o[2]).to.be.equal("I am sorry.,");
        expect(o[3]).to.be.equal("and");
        expect(o[4]).to.be.equal("he");
        expect(o[5]).to.be.equal("said");
        expect(o[6]).to.be.equal("it doesn't matter.");
    });

    it("should split single quoted string", () => {
        const i = 'I said "I am sorry.", and he said "it doesn\'t matter."';
        const o = splitArgs(i);
        expect(o.length).to.be.equal(7);
        expect(o[0]).to.be.equal("I");
        expect(o[1]).to.be.equal("said");
        expect(o[2]).to.be.equal("I am sorry.,");
        expect(o[3]).to.be.equal("and");
        expect(o[4]).to.be.equal("he");
        expect(o[5]).to.be.equal("said");
        expect(o[6]).to.be.equal("it doesn't matter.");
    });

    it("should split pure single quoted string", () => {
        const i = 'I said \'I am sorry.\', and he said "it doesn\'t matter."';
        const o = splitArgs(i);
        expect(o.length).to.be.equal(7);
        expect(o[0]).to.be.equal("I");
        expect(o[1]).to.be.equal("said");
        expect(o[2]).to.be.equal("I am sorry.,");
        expect(o[3]).to.be.equal("and");
        expect(o[4]).to.be.equal("he");
        expect(o[5]).to.be.equal("said");
        expect(o[6]).to.be.equal("it doesn't matter.");
    });

    it("should split to 4 empty strings", () => {
        const i = ",,,";
        const o = splitArgs(i, ",", true);
        expect(o.length).to.be.equal(4);
    });
});
