const runOnAndOff = require("../utils/on_and_off");

const commandCount = 93;
describe("commands", () => runOnAndOff((thing) => {
    let ipfs;

    before(function () {
        this.timeout(30 * 1000);
        ipfs = thing.ipfs;
    });

    it("list the commands", () => {
        return ipfs("commands").then((out) => {
            expect(out.split("\n")).to.have.length(commandCount + 1);
        });
    });
}));
