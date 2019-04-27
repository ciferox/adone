const {
    fs: { junk }
} = adone;

const fixture = [
    ".DS_Store",
    ".AppleDouble",
    ".LSOverride",
    "Icon\r",
    "._test",
    ".Spotlight-V100",
    ".Spotlight-V100/Store-V2/C6DBF25D-81D4-4B57-907E-B4A555E72C90/0.directoryStoreFile",
    ".Trashes",
    "__MACOSX",
    "test~",
    "Thumbs.db",
    "ehthumbs.db",
    "Desktop.ini",
    "npm-debug.log",
    ".test.swp",
    "@eaDir"
];

const notFixture = [
    "test",
    "Icon",
    "Icons.woff",
    ".Spotlight-V100-unicorn"
];

describe("fs", "junk", () => {
    it("matches junk files", () => {
        for (const element of fixture) {
            assert.isTrue(junk.is(element));
        }
    });
    
    it("does not match non-junk files", () => {
        for (const element of notFixture) {
            assert.isTrue(junk.not(element));
        }
    });    
});
