import repoSetup from "./utils/repository_setup";
const {
    fs,
    std: { path }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("ConvenientLine", () => {
    const repoPath = local("repos/convenientLineTest");
    const unicodeLine = "Ťḥ𝖎ṧ ℓỈ𝓃ệ çǒ𝚗ẗảḭṋṦ Û𝐧ǐ𝗰ṓḍ𝔢\n";
    const asciiLine = "but this line doesn't\n";

    beforeEach(function () {
        const test = this;

        return repoSetup.createRepository(repoPath).then((repo) => {
            return repoSetup.commitFileToRepo(repo, "fileWithUnicodeChars", unicodeLine + asciiLine);
        }).then((commit) => {
            return commit.getDiff();
        }).then((diff) => {
            return diff[0].patches();
        }).then((patches) => {
            return patches[0].hunks();
        }).then((hunks) => {
            return hunks[0].lines();
        }).then((lines) => {
            test.unicodeLine = lines[0];
            test.asciiLine = lines[1];
        });
    });

    after(() => {
        return fs.rm(repoPath);
    });

    it("can parse the byte length of a unicode string", function () {
        const line = this.unicodeLine;

        assert.equal(line.contentLen(), Buffer.byteLength(unicodeLine, "utf8"));
    });

    it("can get a line that contains unicode", function () {
        const line = this.unicodeLine;

        assert.equal(line.content(), unicodeLine);
    });

    it("can parse the byte length of a ascii string", function () {
        const line = this.asciiLine;

        assert.equal(line.contentLen(), Buffer.byteLength(asciiLine, "utf8"));
    });

    it("can get a line that contains ascii", function () {
        const line = this.asciiLine;

        assert.equal(line.content(), asciiLine);
    });
});
