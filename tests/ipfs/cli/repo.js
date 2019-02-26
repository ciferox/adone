const { repoVersion } = adone.ipfs.Repo;

const runOnAndOff = require("../utils/on_and_off");

describe("repo", () => runOnAndOff((thing) => {
    let ipfs;

    before(() => {
        ipfs = thing.ipfs;
    });

    it("get the repo version", () => {
        return ipfs("repo version").then((out) => {
            expect(out).to.eql(`${repoVersion}\n`);
        });
    });
}));
