import RepoUtils from "./utils/repository_setup";
import IndexUtils from "./utils/index_setup";

const {
    fs,
    std: { path },
    vcs: { git: { Cred, Repository, Index, Signature } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Repository", () => {
    const reposPath = local("repos/workdir");
    const newRepoPath = local("repos/newrepo");
    const emptyRepoPath = local("repos/empty");

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
        }).then(() => {
            return Repository.open(emptyRepoPath);
        }).then((emptyRepo) => {
            test.emptyRepo = emptyRepo;
        });
    });

    it("cannot instantiate a repository", () => {
        assert.throws(() => new Repository());
    });

    it("can open a valid repository", function () {
        assert.ok(this.repository instanceof Repository);
    });

    it("cannot open an invalid repository", () => {
        return Repository.open("repos/nonrepo").then(null, (err) => {
            assert.ok(err instanceof Error);
        });
    });

    it("does not try to open paths that don't exist", () => {
        const missingPath = "/surely/this/directory/does/not/exist/on/this/machine";

        return Repository.open(missingPath).then(null, (err) => {
            assert.ok(err instanceof Error);
        });
    });

    it("can initialize a repository into a folder", () => {
        return Repository.init(newRepoPath, 1).then((path, isBare) => {
            return Repository.open(newRepoPath);
        });
    });

    it("can utilize repository init options", () => {
        return fs.rm(newRepoPath).then(() => {
            return Repository.initExt(newRepoPath, {
                flags: Repository.INIT_FLAG.MKPATH
            });
        });
    });

    it("can be cleaned", function () {
        this.repository.cleanup();

        // try getting a commit after cleanup (to test that the repo is usable)
        return this.repository.getHeadCommit().then((commit) => {
            assert.equal(commit.toString(), "32789a79e71fbc9e04d3eff7425e1771eb595150");
        });
    });

    it("can read the index", function () {
        return this.repository.index().then((index) => {
            assert.ok(index instanceof Index);
        });
    });

    it("can list remotes", function () {
        return this.repository.getRemotes().then((remotes) => {
            assert.equal(remotes.length, 1);
            assert.equal(remotes[0], "origin");
        });
    });

    it("can get the current branch", function () {
        return this.repository.getCurrentBranch().then((branch) => {
            assert.equal(branch.shorthand(), "master");
        });
    });

    it("can get the default signature", function () {
        const sig = this.repository.defaultSignature();

        assert(sig instanceof Signature);
    });

    it("gets statuses with StatusFile", function () {
        const fileName = "my-new-file-that-shouldnt-exist.file";
        const fileContent = "new file from repository test";
        const repo = this.repository;
        const filePath = path.join(repo.workdir(), fileName);

        return fs.writeFile(filePath, fileContent).then(() => {
            return repo.getStatus().then((statuses) => {
                assert.equal(statuses.length, 1);
                assert.equal(statuses[0].path(), fileName);
                assert.ok(statuses[0].isNew());
            });
        }).then(() => {
            return fs.rm(filePath);
        }).catch((e) => {
            return fs.rm(filePath).then(() => {
                return Promise.reject(e);
            });
        });
    });

    it("gets extended statuses", function () {
        const fileName = "my-new-file-that-shouldnt-exist.file";
        const fileContent = "new file from repository test";
        const repo = this.repository;
        const filePath = path.join(repo.workdir(), fileName);

        return fs.writeFile(filePath, fileContent).then(() => {
            return repo.getStatusExt();
        }).then((statuses) => {
            assert.equal(statuses.length, 1);
            assert.equal(statuses[0].path(), fileName);
            assert.equal(statuses[0].indexToWorkdir().newFile().path(), fileName);
            assert.ok(statuses[0].isNew());
        }).then(() => {
            return fs.rm(filePath);
        }).catch((e) => {
            return fs.rm(filePath).then(() => {
                return Promise.reject(e);
            });
        });
    });

    it("gets fetch-heads", function () {
        const repo = this.repository;
        let foundMaster;

        return repo.fetch("origin", {
            credentials(url, userName) {
                return Cred.sshKeyFromAgent(userName);
            },
            certificateCheck() {
                return 1;
            }
        }).then(() => {
            return repo.fetchheadForeach((refname, remoteUrl, oid, isMerge) => {
                if (refname === "refs/heads/master") {
                    foundMaster = true;
                    assert.equal(refname, "refs/heads/master");
                    assert.equal(remoteUrl, "https://github.com/nodegit/test");
                    assert.equal(oid.toString(), "32789a79e71fbc9e04d3eff7425e1771eb595150");
                    assert.equal(isMerge, 1);
                }
            });
        }).then(() => {
            if (!foundMaster) {
                throw new Error("Couldn't find master in iteration of fetch heads");
            }
        });
    });

    it("can discover if a path is part of a repository", () => {
        const testPath = path.join(reposPath, "lib", "util", "normalize_oid.js");
        const expectedPath = path.join(reposPath, ".git");
        return Repository.discover(testPath, 0, "").then((foundPath) => {
            assert.equal(expectedPath, foundPath);
        });
    });

    it("can create a repo using initExt", () => {
        const initFlags = Repository.INIT_FLAG.NO_REINIT | Repository.INIT_FLAG.MKPATH | Repository.INIT_FLAG.MKDIR;
        return fs.rm(newRepoPath).then(() => {
            return Repository.initExt(newRepoPath, { flags: initFlags });
        }).then(() => {
            return Repository.open(newRepoPath);
        });
    });

    it("will throw when a repo cannot be initialized using initExt", () => {
        const initFlags = Repository.INIT_FLAG.NO_REINIT |
            Repository.INIT_FLAG.MKPATH |
            Repository.INIT_FLAG.MKDIR;

        const nonsensePath = "gibberish";

        return Repository.initExt(nonsensePath, { flags: initFlags }).then(() => {
            assert.fail("Should have thrown an error.");
        }).catch((error) => {
            assert(error, "Should have thrown an error.");
        });
    });

    it("can get the head commit", function () {
        return this.repository.getHeadCommit().then((commit) => {
            assert.equal(commit.toString(), "32789a79e71fbc9e04d3eff7425e1771eb595150");
        });
    });

    it("returns null if there is no head commit", function () {
        return this.emptyRepo.getHeadCommit().then((commit) => {
            assert(!commit);
        });
    });

    it("can commit on head on a empty repo with createCommitOnHead", function () {
        const fileName = "my-new-file-that-shouldnt-exist.file";
        const fileContent = "new file from repository test";
        const repo = this.emptyRepo;
        const filePath = path.join(repo.workdir(), fileName);
        const authSig = repo.defaultSignature();
        const commitSig = repo.defaultSignature();
        const commitMsg = "Doug this has been commited";

        return fs.writeFile(filePath, fileContent).then(() => {
            return repo.createCommitOnHead([fileName], authSig, commitSig, commitMsg);
        }).then((oidResult) => {
            return repo.getHeadCommit().then((commit) => {
                assert.equal(commit.toString(), oidResult.toString());
            });
        });
    });

    it("can get all merge heads in a repo with mergeheadForeach", () => {
        let repo;
        const repoPath = local("repos/merge-head");
        const ourBranchName = "ours";
        const theirBranchName = "theirs";
        let theirBranch;
        const fileName = "testFile.txt";
        let numMergeHeads = 0;
        const assertBranchTargetIs = function (theirBranch, mergeHead) {
            assert.equal(theirBranch.target(), mergeHead.toString());
            numMergeHeads++;
        };

        return RepoUtils.createRepository(repoPath).then((_repo) => {
            repo = _repo;
            return IndexUtils.createConflict(repo, ourBranchName, theirBranchName, fileName);
        }).then(() => {
            return repo.getBranch(theirBranchName);
        }).then((_theirBranch) => {
            // Write the MERGE_HEAD file manually since createConflict does not
            theirBranch = _theirBranch;
            return fs.writeFile(path.join(repoPath, ".git", "MERGE_HEAD"), `${theirBranch.target().toString()}\n`);
        }).then(function () {
            return repo.mergeheadForeach(
                assertBranchTargetIs.bind(this, theirBranch)
            );
        }).then(() => {
            assert.equal(numMergeHeads, 1);
        });
    });
});
