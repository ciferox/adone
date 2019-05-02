const srcPath = (...args) => adone.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "crypto", ...args);
const util = require(srcPath("util"));
const BN = require("bn.js");

describe("Util", () => {
    let bn;

    before((done) => {
        bn = new BN("dead", 16);
        done();
    });

    it("toBase64", (done) => {
        expect(util.toBase64(bn)).to.eql("3q0");
        done();
    });

    it("toBase64 zero padding", (done) => {
        const bnpad = new BN("ff", 16);
        expect(util.toBase64(bnpad, 2)).to.eql("AP8");
        done();
    });
});
