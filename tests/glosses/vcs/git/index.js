import RepoUtils from "./utils/repository_setup";
import IndexUtils from "./utils/index_setup";

const {
    fs,
    std: { path },
    vcs: { git: { Error: GitError, Checkout, Repository, Signature } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Index", () => {
    const reposPath = local("repos/workdir");
    const ErrorCodes = GitError.CODE;

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repo) => {
            test.repository = repo;
            return repo.refreshIndex();
        }).then((index) => {
            test.index = index;
        });
    });

    after(function () {
        this.index.clear();
    });

    it("can get the index of a repo and examine entries", function () {
        const entries = this.index.entries();

        assert.equal(entries[0].path, ".gitignore");
    });

    it("can add all entries to the index", function () {
        const repo = this.repository;
        const index = this.index;
        const fileContent = {
            newFile1: "this has some content",
            newFile2: "and this will have more content"
        };
        const fileNames = Object.keys(fileContent);
        const test = this;
        let addCallbacksCount = 0;

        return Promise.all(fileNames.map((fileName) => {
            return fs.writeFile(path.join(repo.workdir(), fileName), fileContent[fileName]);
        })).then(() => {
            return index.addAll(undefined, undefined, () => {
                addCallbacksCount++;
                // ensure that there is no deadlock if we call
                // a sync libgit2 function from the callback
                test.repository.path();

                return 0; // confirm add
            });
        }).then(() => {
            assert.equal(addCallbacksCount, 2);

            const newFiles = index.entries().filter((entry) => {
                return ~fileNames.indexOf(entry.path);
            });

            assert.equal(newFiles.length, 2);
        }).then(() => {
            return Promise.all(fileNames.map((fileName) => {
                return fs.rm(path.join(repo.workdir(), fileName));
            }));
        }).then(() => {
            return index.clear();
        });
    });

    it("can remove entries from the index", function () {
        const repo = this.repository;
        const index = this.index;
        const fileContent = {
            newFile1: "this has some content",
            newFile2: "and this will have more content",
            differentFileName: "this has a different name and shouldn't be deleted"
        };
        const fileNames = Object.keys(fileContent);
        let removeCallbacksCount = 0;

        return Promise.all(fileNames.map((fileName) => {
            return fs.writeFile(path.join(repo.workdir(), fileName), fileContent[fileName]);
        })).then(() => {
            return index.addAll();
        }).then(() => {
            const newFiles = index.entries().filter((entry) => {
                return ~fileNames.indexOf(entry.path);
            });

            assert.equal(newFiles.length, 3);

            return index.removeAll("newFile*", () => {
                removeCallbacksCount++;

                return 0; // confirm remove
            });
        }).then(() => {
            assert.equal(removeCallbacksCount, 2);

            const newFiles = index.entries().filter((entry) => {
                return ~fileNames.indexOf(entry.path);
            });

            assert.equal(newFiles.length, 1);
        }).then(() => {
            return Promise.all(fileNames.map((fileName) => {
                return fs.rm(path.join(repo.workdir(), fileName));
            }));
        }).then(() => {
            return index.clear();
        });
    });

    it("can update entries in the index", function () {
        const repo = this.repository;
        const index = this.index;
        const fileContent = {
            newFile1: "this has some content",
            newFile2: "and this will have more content"
        };
        const fileNames = Object.keys(fileContent);
        let updateCallbacksCount = 0;

        return Promise.all(fileNames.map((fileName) => {
            return fs.writeFile(path.join(repo.workdir(), fileName), fileContent[fileName]);
        })).then(() => {
            return index.addAll();
        }).then(() => {
            const newFiles = index.entries().filter((entry) => {
                return ~fileNames.indexOf(entry.path);
            });

            assert.equal(newFiles.length, 2);

            return fs.rm(path.join(repo.workdir(), fileNames[0]));
        }).then(() => {
            return index.updateAll("newFile*", () => {
                updateCallbacksCount++;

                return 0; // confirm update
            });
        }).then(() => {
            assert.equal(updateCallbacksCount, 1);

            const newFiles = index.entries().filter((entry) => {
                return ~fileNames.indexOf(entry.path);
            });

            assert.equal(newFiles.length, 1);
            return fs.rm(path.join(repo.workdir(), fileNames[1]));
        });
    });

    it("can get a conflict from the index", () => {
        const fileName = "everyonesFile.txt";
        const rebaseReposPath = local("repos/rebase");
        const ourBranchName = "ours";
        const theirBranchName = "theirs";

        const baseFileContent = "How do you feel about Toll Roads?\n";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!\n";
        const theirFileContent = "I'm skeptical about Toll Roads\n";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        let repository;
        let ourCommit;
        let ourBranch;
        let theirBranch;

        return Repository.init(rebaseReposPath, 0).then((repo) => {
            repository = repo;
            return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            assert.equal(oid.toString(),
                "044704f62399fecbe22da6d7d47b14e52625630e");

            return repository.createCommit("HEAD", ourSignature,
                ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(),
                "80111c46ac73b857a3493b24c81df08639b5de99");

            return repository.getCommit(commitOid).then((commit) => {
                ourCommit = commit;
            }).then(() => {
                return repository.createBranch(ourBranchName, commitOid).then((branch) => {
                    ourBranch = branch;
                    return repository.createBranch(theirBranchName, commitOid);
                });
            });
        }).then((branch) => {
            theirBranch = branch;
            return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent + theirFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "b826e989aca7647bea64810f0a2a38acbbdd4c1a");

            return repository.createCommit(theirBranch.name(), theirSignature,
                theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "b3c355bb606ec7da87174dfa1a0b0c0e3dc97bc0");

            return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent + ourFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "e7fe41bf7c0c28766887a63ffe2f03f624276fbe");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "28cfeb17f66132edb3c4dacb7ff38e8dd48a1844");

            const opts = {
                checkoutStrategy: Checkout.STRATEGY.FORCE
            };

            return Checkout.head(repository, opts);
        }).then(() => {
            return repository.mergeBranches(ourBranchName, theirBranchName);
        }).then((commit) => {
            assert.fail(commit, undefined, "The index should have been thrown due to merge conflicts");
        }).catch((index) => {
            assert.ok(index);
            assert.ok(index.hasConflicts());

            return index.conflictGet(fileName);
        }).then((conflict) => {
            const promises = [];

            promises.push(repository.getBlob(conflict.ancestor_out.id).then((blob) => {
                assert.equal(blob.toString(), baseFileContent);
            }));

            promises.push(repository.getBlob(conflict.our_out.id).then((blob) => {
                assert.equal(blob.toString(), baseFileContent + ourFileContent);
            }));

            promises.push(repository.getBlob(conflict.their_out.id).then((blob) => {
                assert.equal(blob.toString(), baseFileContent + theirFileContent);
            }));

            return Promise.all(promises);
        });
    });

    it("can add a conflict to the index", () => {
        let repo;
        const repoPath = local("repos/index");
        const ourBranchName = "ours";
        const theirBranchName = "theirs";
        const fileName = "testFile.txt";
        let ancestorIndexEntry;
        let ourIndexEntry;
        let theirIndexEntry;

        return RepoUtils.createRepository(repoPath).then((_repo) => {
            repo = _repo;
            return IndexUtils.createConflict(
                repo,
                ourBranchName,
                theirBranchName,
                fileName
            );
        }).then((index) => {
            assert.ok(index.hasConflicts());
            return index.conflictGet(fileName);
        }).then((indexEntries) => {
            // Store all indexEntries for conflict
            ancestorIndexEntry = indexEntries.ancestor_out;
            ourIndexEntry = indexEntries.our_out;
            theirIndexEntry = indexEntries.their_out;

            // Stage conflicted file
            return RepoUtils.addFileToIndex(repo, fileName);
        }).then(() => {
            return repo.index();
        }).then((index) => {
            assert.ok(!index.hasConflicts());
            return index.conflictAdd(
                ancestorIndexEntry,
                ourIndexEntry,
                theirIndexEntry
            );
        }).then(() => {
            return repo.index();
        }).then((index) => {
            assert(index.hasConflicts());
        });
    });

    it("can find the specified file in the index", function () {
        const test = this;

        return test.index.find("src/wrapper.cc")
            .then((position) => {
                assert.notEqual(position, null);
            });
    });

    it("cannot find the specified file in the index", function () {
        const test = this;

        return test.index.find("src/thisisfake.cc").then((position) => {
            assert.fail("the item should not be found");
        }).catch((error) => {
            assert.strictEqual(error.errno, ErrorCodes.ENOTFOUND);
        });
    });

    it("cannot find the directory in the index", function () {
        const test = this;

        return test.index.find("src").then((position) => {
            assert.fail("the item should not be found");
        }).catch((error) => {
            assert.strictEqual(error.errno, ErrorCodes.ENOTFOUND);
        });
    });

    it("can find the specified prefix in the index", function () {
        const test = this;

        return test.index.findPrefix("src/").then((position) => {
            assert.notEqual(position, null);
        });
    });

    it("cannot find the specified prefix in the index", function () {
        const test = this;

        return test.index.find("testing123/").then((position) => {
            assert.fail("the item should not be found");
        }).catch((error) => {
            assert.strictEqual(error.errno, ErrorCodes.ENOTFOUND);
        });
    });

    it("can find the prefix when a file shares the name", function () {
        const test = this;

        return test.index.find("LICENSE").then((position) => {
            assert.notEqual(position, null);
        });
    });
});
