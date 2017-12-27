const BN = require("bn.js");

const { util } = adone.private(adone.netron2.crypto);

describe("netron2", "crypto", "util", () => {
    let bn;

    before(() => {
        bn = new BN("dead", 16);
    });

    it("toBase64", () => {
        expect(util.toBase64(bn)).to.eql("3q0");
    });

    it("toBase64 zero padding", () => {
        const bnpad = new BN("ff", 16);
        expect(util.toBase64(bnpad, 2)).to.eql("AP8");
    });
});
