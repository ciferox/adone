const {
    std: { path },
    vcs: { git: { Repository } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Patch", () => {
    const reposPath = local("repos/workdir");
    const oid = "fce88902e66c72b5b93e75bdb5ae717038b221f6";

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;

            return repository.refreshIndex();
        }).then((index) => {
            test.index = index;

            return test.repository.getBranchCommit("master");
        }).then((masterCommit) => {
            return masterCommit.getTree();
        }).then((tree) => {
            test.masterCommitTree = tree;

            return test.repository.getCommit(oid);
        }).then((commit) => {
            test.commit = commit;

            return commit.getDiff();
        }).then((diff) => {
            test.diff = diff;

            return diff[0].patches();
        }).catch((e) => {
            return Promise.reject(e);
        });
    });

    it("retrieve the line stats of a patch", function () {
        return this.diff[0].patches().then((patches) => {
            const patch = patches[0];
            const lineStats = patch.lineStats();

            assert.equal(patch.oldFile().path(), "README.md");
            assert.equal(patch.newFile().path(), "README.md");
            assert.equal(patch.size(), 1);
            assert.ok(patch.isModified());
            assert.equal(lineStats.total_context, 3);
            assert.equal(lineStats.total_additions, 1);
            assert.equal(lineStats.total_deletions, 1);
        });

    });


});
