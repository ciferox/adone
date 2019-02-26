const runOnAndOff = require("../utils/on_and_off");

describe("general cli options", () => runOnAndOff.off((thing) => {
    it("should handle --silent flag", () => {
        return thing.ipfs("help --silent").then((out) => {
            expect(out).to.be.empty();
        });
    });

    it("should handle unknown arguments correctly", () => {
        return thing.ipfs("random --again").then((out) => {
            expect(out).to.include("Unknown arguments: again, random");
            expect(out).to.include("random");
            expect(out).to.include("again");
        });
    });
}));
