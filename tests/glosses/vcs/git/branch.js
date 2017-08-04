const {
    std: { path },
    vcs: { git: { Repository, Branch, AnnotatedCommit } }
} = adone;
const local = path.join.bind(path, __dirname, "fixtures");

describe("Branch", () => {
    const branchName = "test-branch";
    const branchName2 = "test-branch2";
    const fullBranchName = `refs/heads/${branchName}`;
    const fullBranchName2 = `refs/heads/${branchName2}`;
    const remoteName = "origin";
    const upstreamName = "origin/master";
    const fullUpstreamName = "refs/remotes/origin/master";
    const nonHeadCommit = "c82fb078a192ea221c9f1093c64321c60d64aa0d";

    const reposPath = local("repos/workdir");

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
            return repository.getMasterCommit();
        }).then((masterCommit) => {
            test.masterCommit = masterCommit;

            return test.repository.createBranch(branchName, masterCommit, true);
        }).then((branch) => {
            test.branch = branch;
            return test.repository.createBranch(
                branchName2, test.masterCommit, true);
        });
    });

    it("can create a branch", function () {
        const branch = this.branch;
        const masterCommit = this.masterCommit;

        assert.equal(branch.name(), fullBranchName);
        assert.equal(branch.target().toString(), masterCommit.sha());
    });

    it("can delete a branch", function () {
        const repo = this.repository;

        Branch.delete(this.branch);

        return repo.getBranch(branchName)
            // Reverse the results, since if we found it it wasn't deleted
            .then(Promise.reject.bind(Promise), Promise.resolve.bind(Promise));
    });

    it("can see if the branch is pointed to by head", function () {
        const repo = this.repository;

        return repo.getBranch("master").then((branch) => {
            assert.ok(branch.isHead());
        });
    });

    it("can set an upstream for a branch", function () {
        const branch = this.branch;

        return Branch.setUpstream(branch, upstreamName).then(() => {
            return Branch.upstream(branch);
        }).then((upstream) => {
            assert.equal(upstream.shorthand(), upstreamName);
        });
    });

    it("can get the name of a branch", function () {
        const branch = this.branch;

        return Branch.name(branch).then((branchNameToTest) => {
            assert.equal(branchNameToTest, branchName);
        });
    });

    it("can get the remote name of a branch", function () {
        const repo = this.repository;

        return Branch.remoteName(repo, fullUpstreamName).then((remoteNameToTest) => {
            assert.equal(remoteNameToTest, remoteName);
        });
    });

    it("cannot get remote name from a non-remote branch", function () {
        const repo = this.repository;

        return Branch.remoteName(repo, fullBranchName).then(() => {
            assert.fail("The ref should not have been a remote");
        }).catch((err) => {
            assert.strictEqual(err.errno, -1);
        });
    });

    it("can rename a branch", function () {
        const branch = this.branch;

        // don't force the move
        return Branch.move(branch, branchName2, 0).then((branch) => {
            return Promise.reject(new Error(
                "should not be able to rename the branch"));
        }, (error) => {
            return Promise.resolve().then(() => {
                // force the move
                return Branch.move(branch, branchName2, 1);
            }).then((branch) => {
                assert.equal(branch.name(), fullBranchName2);
            });
        });
    });

    it("can lookup a branch", function () {
        const repo = this.repository;

        return Branch.lookup(repo, branchName, Branch.BRANCH.LOCAL).then((branch) => {
            assert.equal(branch.name(), fullBranchName);
            return Branch.lookup(repo, upstreamName, Branch.BRANCH.REMOTE);
        }).then((branch) => {
            assert.equal(branch.name(), fullUpstreamName);
        });
    });

    it("can create branch from annotated commit", function () {
        const repo = this.repository;
        let annotatedCommit = null;

        return AnnotatedCommit.fromRevspec(repo, nonHeadCommit).then((theAnnotatedCommit) => {
            annotatedCommit = theAnnotatedCommit;
            return Branch.createFromAnnotated(
                repo, branchName, annotatedCommit, 0);
        }).then((branch) => {
            return Promise.reject(new Error(
                "should not be able to create the branch"));
        }, (error) => {
            return Promise.resolve().then(() => {
                // force the branch creation
                return Branch.createFromAnnotated(
                    repo, branchName, annotatedCommit, 1);
            }).then((branch) => {
                assert.equal(branch.name(), fullBranchName);
            });
        });
    });
});
