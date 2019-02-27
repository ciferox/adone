const os = require("os");
const pkgversion = adone.package.version;
const runOnAndOff = require("../utils/on_and_off");

const {
    ipfs: { Repo: { repoVersion } }
} = adone;

describe("version", () => runOnAndOff((thing) => {
    let ipfs;

    before(() => {
        ipfs = thing.ipfs;
    });

    it("get the version", () =>
        ipfs("version").then((out) =>
            expect(out).to.eql(
                `js-ipfs version: ${pkgversion}\n`
            )
        )
    );

    it("handles --number", () =>
        ipfs("version --number").then((out) =>
            expect(out).to.eql(`${pkgversion}\n`)
        )
    );

    it("handles --commit", () =>
        ipfs("version --commit").then((out) =>
            expect(out).to.eql(`js-ipfs version: ${pkgversion}-\n`)
        )
    );

    describe("handles --all", () => {
        it("prints js-ipfs version", () =>
            ipfs("version --all").then((out) => {
                expect(out).to.include(`js-ipfs version: ${pkgversion}`);
            })
        );

        it("prints repo version", () =>
            ipfs("version --all").then((out) => {
                expect(out).to.include(`Repo version: ${repoVersion}`);
            })
        );

        it("prints arch/platform", () =>
            ipfs("version --all").then((out) => {
                expect(out).to.include(`System version: ${os.arch()}/${os.platform()}`);
            })
        );

        it("prints Node.js version", () =>
            ipfs("version --all").then((out) => {
                expect(out).to.include(`Node.js version: ${process.version}`);
            })
        );
    });

    it("handles --repo", () =>
        ipfs("version --repo").then((out) =>
            expect(out).to.eql(`${repoVersion}\n`)
        )
    );
}));
