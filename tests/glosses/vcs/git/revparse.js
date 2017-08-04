const {
    std: { path },
    vcs: { git: { Repository, Revparse } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Revparse", () => {
    const reposPath = local("repos/workdir");

    beforeEach(function () {
        const test = this;
        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
            return test.repository.getHeadCommit();
        }).then((commit) => {
            test.commit = commit;
        });
    });

    it("can revparse HEAD commit with single method", function () {
        const test = this;
        return Revparse.single(this.repository, "HEAD").then((headCommit) => {
            assert.ok(headCommit.isCommit());
            assert.equal(headCommit.id().toString(), test.commit.id().toString());
        });
    });

    it("will fail on invalid spec", function () {
        return Revparse.single(this.repository, "INVALID").then(() => {
        }).catch((error) => {
            assert.ok(error instanceof Error);
            assert.equal(error.message, "revspec 'INVALID' not found");
        });
    });

    it("will fail without repo", () => {
        return Revparse.single("", "INVALID").then(() => {

        }).catch((error) => {
            assert.ok(error instanceof Error);
            assert.equal(error.message, "Repository repo is required.");
        });
    });

    it("will fail without spec", function () {
        return Revparse.single(this.repository).then(() => {

        }).catch((error) => {
            assert.ok(error instanceof Error);
            assert.equal(error.message, "String spec is required.");
        });
    });
});
