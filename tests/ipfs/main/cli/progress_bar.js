const createProgressBar = require(adone.path.join(adone.ROOT_PATH, "lib/ipfs/main/cli/utils")).createProgressBar;

describe("progress bar", () => {
    it("created with the correct properties", () => {
        const total = 1000;

        const bar = createProgressBar(total);
        expect(bar.total).to.eql(total);
        expect(typeof bar.tick).to.eql("function");
    });
});
