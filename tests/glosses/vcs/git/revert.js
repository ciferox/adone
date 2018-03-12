import RepoUtils from "./utils/repository_setup";
const {
    std: { path, fs },
    vcs: { git: { Revert, RevertOptions } },
    lodash: _
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Revert", () => {
    let test;
    const fileName = "foobar.js";
    const repoPath = local("repos/revertRepo");

    beforeEach(function () {
        test = this;

        return RepoUtils.createRepository(repoPath).then((repository) => {
            test.repository = repository;

            return RepoUtils.commitFileToRepo(repository, fileName, "line1\nline2\nline3");
        }).then((firstCommit) => {
            test.firstCommit = firstCommit;
        });
    });

    it("revert modifies the working directoy", () => {
        const fileStats = fs.statSync(path.join(repoPath, fileName));
        assert.ok(fileStats.isFile());

        Revert.revert(test.repository, test.firstCommit, new RevertOptions()).then(() => {
            try {
                fs.statSync(path.join(repoPath, fileName));
                assert.fail("Working directory was not reverted");
            } catch (error) {
                // pass
            }
        });
    });

    it.skip("revert modifies the index", () => {
        return Revert.revert(test.repository, test.firstCommit, new RevertOptions()).then(() => {
            return test.repository.index();
        }).then((index) => {
            const entries = index.entries;
            assert.equal(1, entries.length);
            assert.ok(_.endsWith(fileName, entries[0].path));
        });
    });

    it("RevertOptions is optional", () => {
        return Revert.revert(test.repository, test.firstCommit, null).catch((error) => {
            throw error;
        });
    });
});
