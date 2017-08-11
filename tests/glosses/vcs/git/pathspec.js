const {
    vcs: { git: { Pathspec } }
} = adone;

describe("Pathspec", () => {
    it("can accept just about anything against a * pathspec", () => {
        const pathspec = Pathspec.create("*");

        assert.equal(pathspec.matchesPath(0, "burritoooo"), 1);
        assert.equal(pathspec.matchesPath(0, "bob/ted/yoghurt.mp3"), 1);
    });

    it("can take a * in an array", () => {
        const pathspec = Pathspec.create("*");

        assert.equal(pathspec.matchesPath(0, "burritoooo"), 1);
        assert.equal(pathspec.matchesPath(0, "bob/ted/yoghurt.mp3"), 1);
    });

    it("can take a single file", () => {
        const pathspec = Pathspec.create(["myDir/burritoSupreme.mp4"]);

        assert.equal(pathspec.matchesPath(0, "myDir/burritoSupreme.mp4"), 1);
        assert.equal(pathspec.matchesPath(0, "bob/ted/yoghurt.mp3"), 0);
    });

    it("can take files in an array", () => {
        const pathspec = Pathspec.create(["gwendoline.txt", "sausolito.ogg"]);

        assert.equal(pathspec.matchesPath(0, "gwendoline.txt"), 1);
        assert.equal(pathspec.matchesPath(0, "sausolito.ogg"), 1);
        assert.equal(pathspec.matchesPath(0, "sausolito.txt"), 0);
    });

    it("can handle dirs", () => {
        const pathspec = Pathspec.create(["myDir/", "bob.js"]);

        assert.equal(pathspec.matchesPath(0, "bob.js"), 1);
        assert.equal(pathspec.matchesPath(0, "myDir/bob2.js"), 1);
        assert.equal(pathspec.matchesPath(0, "bob2.js"), 0);
        assert.equal(pathspec.matchesPath(0, "herDir/bob.js"), 0);
    });
});
