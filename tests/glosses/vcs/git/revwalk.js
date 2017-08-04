import RepoUtils from "./utils/repository_setup";
const {
    fs,
    std: { path },
    vcs: { git: { Diff, Reference, Signature, Repository, Revwalk, Oid } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

// const leakTest = require("../utils/leak_test");

describe("Revwalk", function () {
    const reposPath = local("repos/workdir");

    // Set a reasonable timeout here now that our repository has grown.
    this.timeout(120000);

    beforeEach(function () {
        const test = this;
        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
            return test.repository.getBranchCommit("rev-walk");
        }).then((commit) => {
            test.commit = commit;
        });
    });

    beforeEach(function () {
        this.walker = this.repository.createRevWalk();
        this.walker.sorting(Revwalk.SORT.TIME);
        this.walker.push(this.commit.id());
    });

    it("can create a walker", function () {
        assert.ok(this.walker instanceof Revwalk);
    });

    it("can push an object", function () {
        const sha = this.commit.sha();

        return this.walker.next().then((commit) => {
            assert.equal(sha, commit);
        });
    });

    it("can hide an object", function () {
        const test = this;

        return next(test.walker, 4).then((commit) => {
            assert.equal(commit.toString(), "b8a94aefb22d0534cc0e5acf533989c13d8725dc");

            test.walker = test.repository.createRevWalk();
            test.walker.push(test.commit.id());
            test.walker.hide(Oid.fromString("b8a94aefb22d0534cc0e5acf533989c13d8725dc"));

            return next(test.walker, 3);
        }).then((commit) => {
            assert.equal(commit.toString(), "95f695136203a372751c19b6353aeb5ae32ea40e");
            return next(test.walker, 1);
        }).then((commit) => {
            assert.equal(commit, undefined);
        });
    });

    it("can simplify to first parent", function () {
        const test = this;

        test.walker.simplifyFirstParent();
        return next(test.walker, 3).then((commit) => {
            assert.equal(commit.toString(), "b8a94aefb22d0534cc0e5acf533989c13d8725dc");
        });
    });

    it("can get a specified number of commits", function () {
        const test = this;
        let storedCommits;
        return test.walker.getCommits(10).then((commits) => {
            assert.equal(commits.length, 10);
            storedCommits = commits;
            test.walker = test.repository.createRevWalk();
            test.walker.push(test.commit.id());

            return test.walker.getCommits(8);
        }).then((commits) => {
            assert.equal(commits.length, 8);
            for (let i = 0; i < 8; i++) {
                assert.equal(commits[i].toString(), storedCommits[i].toString());
            }
        });
    });

    it("can get the largest number of commits within a specified range",
        function () {
            const test = this;
            let storedCommits;
            return test.walker.getCommits(991).then((commits) => {
                assert.equal(commits.length, 990);
                storedCommits = commits;
                test.walker = test.repository.createRevWalk();
                test.walker.push(test.commit.id());
            });
        });

    it("will return all commits from the revwalk if nothing matches", function () {
        const test = this;
        const magicSha = "notintherepoatallwhatsoeverisntthatcool";

        const checkCommit = (commit) => commit.toString() !== magicSha;

        return test.walker.getCommitsUntil(checkCommit).then((commits) => {
            assert.equal(commits.length, 990);
        });
    });

    it("can get commits until you tell it not to", function () {
        const test = this;
        const magicSha = "b8a94aefb22d0534cc0e5acf533989c13d8725dc";

        const checkCommit = (commit) => commit.toString() !== magicSha;

        return test.walker.getCommitsUntil(checkCommit).then((commits) => {
            assert.equal(commits.length, 4);
            assert.equal(commits[commits.length - 1].toString(), magicSha);
        });
    });

    it("can do a fast walk", function () {
        const test = this;
        const magicSha = "b8a94aefb22d0534cc0e5acf533989c13d8725dc";

        return test.walker.fastWalk(10).then((commitOids) => {
            assert.equal(commitOids.length, 10);
            assert.equal(commitOids[3].toString(), magicSha);
        });
    });

    it("can get the history of a file", function () {
        const test = this;
        const magicShas = [
            "6ed3027eda383d417457b99b38c73f88f601c368",
            "95cefff6aabd3c1f6138ec289f42fec0921ff610",
            "7ad92a7e4d26a1af93f3450aea8b9d9b8069ea8c",
            "96f077977eb1ffcb63f9ce766cdf110e9392fdf5",
            "694adc5369687c47e02642941906cfc5cb21e6c2",
            "eebd0ead15d62eaf0ba276da53af43bbc3ce43ab",
            "1273fff13b3c28cfdb13ba7f575d696d2a8902e1"
        ];

        return test.walker.fileHistoryWalk("include/functions/copy.h", 1000).then((results) => {
            const shas = results.map((result) => {
                return result.commit.sha();
            });
            assert.equal(magicShas.length, shas.length);
            magicShas.forEach((sha, i) => {
                assert.equal(sha, shas[i]);
            });
        });
    });

    it("can get the history of a file while ignoring parallel branches",
        function () {
            const test = this;
            let magicShas = [
                "f80e085e3118bbd6aad49dad7c53bdc37088bf9b",
                "907b29d8a3b765570435c922a59cd849836a7b51"
            ];
            let shas;
            let walker = test.repository.createRevWalk();
            walker.sorting(Revwalk.SORT.TIME);
            walker.push("115d114e2c4d5028c7a78428f16a4528c51be7dd");

            return walker.fileHistoryWalk("README.md", 15).then((results) => {
                shas = results.map((result) => {
                    return result.commit.sha();
                });
                assert.equal(magicShas.length, shas.length);
                magicShas.forEach((sha, i) => {
                    assert.equal(sha, shas[i]);
                });

                magicShas = [
                    "4a34168b80fe706f52417106821c9cbfec630e47",
                    "f80e085e3118bbd6aad49dad7c53bdc37088bf9b",
                    "694b2d703a02501f288269bea7d1a5d643a83cc8",
                    "907b29d8a3b765570435c922a59cd849836a7b51"
                ];

                walker = test.repository.createRevWalk();
                walker.sorting(Revwalk.SORT.TIME);
                walker.push("d46f7da82969ca6620864d79a55b951be0540bda");

                return walker.fileHistoryWalk("README.md", 50);
            }).then((results) => {
                shas = results.map((result) => {
                    return result.commit.sha();
                });
                assert.equal(magicShas.length, shas.length);
                magicShas.forEach((sha, i) => {
                    assert.equal(sha, shas[i]);
                });
            });
        });

    it("can yield information about renames in a file history walk", () => {
        let treeOid;
        let repo;
        const fileNameA = "a.txt";
        const fileNameB = "b.txt";
        const repoPath = local("repos/renamedFileRepo");
        const signature = Signature.create("Foo bar", "foo@bar.com", 123456789, 60);
        let headCommit;

        return RepoUtils.createRepository(repoPath).then((r) => {
            repo = r;
            return RepoUtils.commitFileToRepo(repo, fileNameA, "line1\nline2\nline3\n");
        }).then(async () => {
            return fs.rename(path.join(repoPath, fileNameA), path.join(repoPath, fileNameB));
        }).then(() => {
            return repo.refreshIndex();
        }).then((index) => {
            return index.addByPath(fileNameB).then(() => {
                return index.removeByPath(fileNameA);
            }).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oidResult) => {
            treeOid = oidResult;
            return Reference.nameToId(repo, "HEAD");
        }).then((head) => {
            return repo.getCommit(head);
        }).then((head) => {
            return repo.createCommit("HEAD", signature, signature, "renamed commit", treeOid, [head]);
        }).then(() => {
            return Reference.nameToId(repo, "HEAD");
        }).then((commitOid) => {
            headCommit = commitOid.tostrS();
            const walker = repo.createRevWalk();
            walker.sorting(Revwalk.SORT.TIME);
            walker.push(commitOid.tostrS());
            return walker.fileHistoryWalk(fileNameB, 5);
        }).then((results) => {
            assert.equal(results[0].status, Diff.DELTA.RENAMED);
            assert.equal(results[0].newName, fileNameB);
            assert.equal(results[0].oldName, fileNameA);
        }).then(() => {
            const walker = repo.createRevWalk();
            walker.sorting(Revwalk.SORT.TIME);
            walker.push(headCommit);
            return walker.fileHistoryWalk(fileNameA, 5);
        }).then((results) => {
            assert.equal(results[0].status, Diff.DELTA.RENAMED);
            assert.equal(results[0].newName, fileNameB);
            assert.equal(results[0].oldName, fileNameA);
        }).then(() => {
            return fs.rm(repoPath);
        });
    });

    it.skip("does not leak", function () {
        const test = this;

        return leakTest(Revwalk, () => {
            return Promise.resolve(Revwalk.create(test.repository));
        });
    });

    // This test requires forcing garbage collection, so mocha needs to be run
    // via node rather than npm, with a la `node --expose-gc [pathtohmoca]
    // [testglob]`
    const testGC = global.gc ? it : it.skip;

    testGC("doesnt segfault when accessing .author() twice", (done) => {
        Repository.open(reposPath).then((repository) => {
            const walker = repository.createRevWalk();

            repository.getMasterCommit().then((firstCommitOnMaster) => {
                walker.walk(firstCommitOnMaster.id(), (err, commit) => {
                    if (err && err.errno === adone.vcs.git.Error.CODE.ITEROVER) {
                        return done();
                    }

                    for (let i = 0; i < 500; i++) {
                        commit.author().name();
                        commit.author().email();

                        if (i % 250 === 0) {
                            global.gc();
                        }
                    }
                });
            });
        });
    });

    const next = (walker, count) => {
        let promise = null;
        const getNext = () => walker.next();

        for (let i = 0; i < count; i++) {
            if (!promise) {
                promise = walker.next();
            } else {
                promise = promise.then(getNext);
            }
        }
        return promise.catch((error) => {
            if (error && error.errno === adone.vcs.git.Error.CODE.ITEROVER) {
                return Promise.resolve();
            }
            throw error;
        });
    };
});
