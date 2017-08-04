const {
    std: { path },
    vcs: { git: { Repository, Ignore } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Ignore", () => {
    const reposPath = local("repos/workdir");

    before(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
        });
    });

    it("can determine if a path is ignored", function () {
        const expectIgnoreState = (repo, fileName, expected) => Ignore.pathIsIgnored(repo, fileName).then((ignored) => {
            assert.equal(ignored, expected);
        });

        return Promise.all([
            expectIgnoreState(this.repository, ".git", true),
            expectIgnoreState(this.repository, "LICENSE", false)
        ]);
    });
});
