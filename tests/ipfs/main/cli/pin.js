const CID = require("cids");
const runOnAndOff = require("../utils/on_and_off");

// fixture structure:
//  planets/
//   solar-system.md
//   mercury/
//    wiki.md
const fixturePath = adone.std.path.join(__dirname, "..", "fixtures", "planets");
const pins = {
    root: "QmTAMavb995EHErSrKo7mB8dYkpaSJxu6ys1a6XJyB2sys",
    solarWiki: "QmTMbkDfvHwq3Aup6Nxqn3KKw9YnoKzcZvuArAfQ9GF3QG",
    mercuryDir: "QmbJCNKXJqVK8CzbjpNFz2YekHwh3CSHpBA86uqYg3sJ8q",
    mercuryWiki: "QmVgSHAdMxFAuMP2JiMAYkB8pCWP1tcB9djqvq8GKAFiHi"
};

describe("pin", () => runOnAndOff((thing) => {
    let ipfs;

    before(function () {
        this.timeout(15 * 1000);
        ipfs = thing.ipfs;
        return ipfs(`add -r ${fixturePath}`);
    });

    describe("rm", () => {
        it("recursively (default)", () => {
            return ipfs(`pin rm ${pins.root}`)
                .then((out) => expect(out).to.equal(`unpinned ${pins.root}\n`));
        });

        it("should rm and print CIDs encoded in specified base", function () {
            this.timeout(30 * 1000);

            return ipfs(`add -r ${fixturePath}`)
                .then(() => ipfs(`pin rm ${pins.root} --cid-base=base64`))
                .then((out) => {
                    const b64CidStr = new CID(pins.root).toV1().toBaseEncodedString("base64");
                    expect(out).to.eql(`unpinned ${b64CidStr}\n`);
                });
        });
    });

    describe("add", () => {
        it("recursively (default)", () => {
            return ipfs(`pin add ${pins.root}`)
                .then((out) =>
                    expect(out).to.eql(`pinned ${pins.root} recursively\n`)
                );
        });

        it("direct", () => {
            return ipfs(`pin add ${pins.solarWiki} --recursive false`)
                .then((out) =>
                    expect(out).to.eql(`pinned ${pins.solarWiki} directly\n`)
                );
        });

        it("should add and print CIDs encoded in specified base", () => {
            return ipfs(`pin add ${pins.root} --cid-base=base64`)
                .then((out) => {
                    const b64CidStr = new CID(pins.root).toV1().toBaseEncodedString("base64");
                    expect(out).to.eql(`pinned ${b64CidStr} recursively\n`);
                });
        });
    });

    describe("ls", () => {
        it("lists all pins when no hash is passed", () => {
            return ipfs("pin ls -q").then((out) => {
                const results = out.split("\n");
                expect(results).to.include.members(Object.values(pins));
            });
        });

        it("handles multiple hashes", () => {
            return ipfs(`pin ls ${pins.root} ${pins.solarWiki}`)
                .then((out) => {
                    expect(out).to.eql(
                        `${pins.root} recursive\n${pins.solarWiki} direct\n`
                    );
                });
        });

        it("can print quietly", () => {
            return ipfs("pin ls -q").then((out) => {
                const firstLineParts = out.split(/\s/)[0].split(" ");
                expect(firstLineParts).to.have.length(1);
            });
        });

        it("should ls and print CIDs encoded in specified base", () => {
            return ipfs(`pin ls ${pins.root} --cid-base=base64`)
                .then((out) => {
                    const b64CidStr = new CID(pins.root).toV1().toBaseEncodedString("base64");
                    expect(out).to.eql(`${b64CidStr} recursive\n`);
                });
        });
    });
}));
