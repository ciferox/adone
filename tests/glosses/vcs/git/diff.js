const {
    fs,
    std: { path },
    vcs: { git: { Blob, Diff, Repository, DiffOptions } },
    vendor: { lodash: _ }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

const getLinesFromDiff = (diff) => {
    return diff.patches().then((patches) => {
        return Promise.all(_.map(patches, (patch) => {
            return patch.hunks();
        }));
    }).then((listsOfHunks) => {
        const hunks = _.flatten(listsOfHunks);
        return Promise.all(_.map(hunks, (hunk) => {
            return hunk.lines();
        }));
    }).then((listsOfLines) => {
        const lines = _.flatten(listsOfLines);
        return _.map(lines, (line) => {
            return line.content();
        });
    });
};

describe("Diff", () => {
    const reposPath = local("repos/workdir");
    const oid = "fce88902e66c72b5b93e75bdb5ae717038b221f6";
    const diffFilename = "wddiff.txt";
    const diffFilepath = local("repos/workdir", diffFilename);

    const moveFromFile = "README.md";
    const moveToFile = "MOVED_README.md";

    const moveFromPath = local("repos/workdir", moveFromFile);
    const moveToPath = local("repos/workdir", moveToFile);

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

            return fs.writeFile(diffFilepath, "1 line\n2 line\n3 line\n\n4");
        }).then(async () => {
            await fs.copyTo(moveFromPath, moveToPath);
            await fs.rm(moveFromPath);
            // return fs.move(moveFromPath, moveToPath);
        }).then(() => {
            return Diff.treeToWorkdirWithIndex(
                test.repository,
                test.masterCommitTree,
                { flags: Diff.OPTION.INCLUDE_UNTRACKED }
            );
        }).then((workdirDiff) => {
            test.workdirDiff = workdirDiff;
        }).then(() => {
            const opts = {
                flags: Diff.OPTION.INCLUDE_UNTRACKED |
                Diff.OPTION.RECURSE_UNTRACKED_DIRS
            };

            return Diff.indexToWorkdir(test.repository, test.index, opts);
        }).then((diff) => {
            test.indexToWorkdirDiff = diff;
        }).then(() => {
            return fs.rm(diffFilepath);
        }).then(async () => {
            await fs.copyTo(moveToPath, moveFromPath);
            await fs.rm(moveToPath);
            // return fs.move(moveToPath, moveFromPath);
        }).catch((e) => {
            return fs.rm(diffFilepath).then(() => {
                return Promise.reject(e);
            });
        });
    });

    it("can walk a DiffList", function () {
        return this.diff[0].patches().then((patches) => {
            const patch = patches[0];

            assert.equal(patch.oldFile().path(), "README.md");
            assert.equal(patch.newFile().path(), "README.md");
            assert.equal(patch.size(), 1);
            assert.ok(patch.isModified());

            return patch.hunks();
        }).then((hunks) => {
            const hunk = hunks[0];
            assert.equal(hunk.size(), 5);

            return hunk.lines();
        }).then((lines) => {
            assert.equal(lines[0].origin(), Diff.LINE.CONTEXT);
            assert.equal(lines[1].origin(), Diff.LINE.CONTEXT);
            assert.equal(lines[2].origin(), Diff.LINE.CONTEXT);

            const oldContent = "__Before submitting a pull request, please ensure " +
                "both unit tests and lint checks pass.__\n";
            assert.equal(lines[3].content(), oldContent);
            assert.equal(lines[3].origin(), Diff.LINE.DELETION);
            assert.equal(lines[3].content().length, oldContent.length);

            const newContent = "__Before submitting a pull request, please ensure " +
                "both that you've added unit tests to cover your shiny new code, " +
                "and that all unit tests and lint checks pass.__\n";
            assert.equal(lines[4].content(), newContent);
            assert.equal(lines[4].origin(), Diff.LINE.ADDITION);
            assert.equal(lines[4].content().length, newContent.length);
        });
    });

    it("can diff the workdir with index", function () {
        return this.workdirDiff.patches().then((patches) => {
            assert.equal(patches.length, 3);
            assert(patches[2].isUntracked());

            const oldFile = patches[2].oldFile();
            assert.equal(oldFile.path(), "wddiff.txt");
            assert.equal(oldFile.size(), 0);

            const newFile = patches[2].newFile();
            assert.equal(newFile.path(), "wddiff.txt");
            assert.equal(newFile.size(), 23);
        });
    });

    it("can resolve individual line changes from the patch hunks", function () {
        return this.workdirDiff.patches().then((patches) => {
            let result = [];
            const hunkPromises = [];

            patches.forEach((patch) => {
                hunkPromises.push(patch.hunks().then((hunks) => {
                    result = result.concat(hunks);
                })
                );
            });

            return Promise.all(hunkPromises).then(() => {
                return result;
            });
        }).then((hunks) => {
            let result = [];
            const linePromises = [];

            hunks.forEach((hunk) => {
                linePromises.push(hunk.lines().then((lines) => {
                    result = result.concat(lines);
                })
                );
            });

            return Promise.all(linePromises).then(() => {
                return result;
            });
        }).then((lines) => {
            lines.forEach((line) => {
                assert(/\n/.exec(line.content()));
                assert(/\n/.exec(line.rawContent()));
            });
        });
    });

    it("can diff the contents of a file to a string", function (done) {
        this.repository.getBranchCommit("master").then((commit) => {
            return commit.getEntry("LICENSE");
        }).then((entry) => {
            const _entry = entry;
            return _entry.getBlob();
        }).then((blob) => {
            const buffer = "New Text";
            return Diff.blobToBuffer(blob, null, buffer, null, null, null, null, (delta, hunk, payload) => {
                assert.equal(hunk.oldStart(), 1);
                assert.equal(hunk.oldLines(), 19);
                assert.equal(hunk.newStart(), 1);
                assert.equal(hunk.newLines(), 1);
                assert.equal(hunk.header().substring(0, hunk.headerLen() - 1), "@@ -1,19 +1 @@");
                done();
            });
        });
    });

    it("can diff the contents of a file to a string with unicode characters", function (done) {
        const test = this;
        const evilString = "Unicode’s fun!\nAnd it’s good for you!\n";
        const buffer = Buffer.from(evilString);
        Blob.createFromBuffer(test.repository, buffer, buffer.length).then((oid) => {
            return Blob.lookup(test.repository, oid);
        }).then((blob) => {
            blob.repo = test.repository;
            return Diff.blobToBuffer(blob, null, evilString, null, null, null, null, (delta, hunk, payload) => {
                assert.fail("There aren't any changes so this shouldn't be called.");
                done();
            });
        }).then(() => {
            done();
        });
    });

    it("can diff with a null tree", function () {
        const repo = this.repository;
        const tree = this.masterCommitTree;
        return Diff.treeToTree(repo, null, tree, null).then((diff) => {
            return diff.patches();
        }).then((patches) => {
            // Number of patches returned is 84 or 85 depending
            // on something unknown at this time. Hopefully we can
            // eventually resolve the root cause of the difference.
            // https://github.com/nodegit/nodegit/issues/746
            assert.ok(patches.length === 84 || patches.length === 85);
        });
    });

    it("can diff the initial commit of a repository", function () {
        const repo = this.repository;
        const oid = "99c88fd2ac9c5e385bd1fe119d89c83dce326219"; // First commit
        return repo.getCommit(oid).then((commit) => {
            return commit.getDiff();
        }).then((diffs) => {
            return diffs[0].patches();
        }).then((patches) => {
            assert.equal(patches.length, 8);
        });
    });

    it("can diff tree to index", function () {
        const repo = this.repository;
        const tree = this.masterCommitTree;
        const index = this.index;
        const opts = { flags: Diff.OPTION.INCLUDE_UNTRACKED };

        return Diff.treeToIndex(repo, tree, index, opts).then((diff) => {
            return diff.patches();
        }).then((patches) => {
            assert.equal(patches.length, 0);
        });
    });

    it("can diff index to workdir", function () {
        return this.indexToWorkdirDiff.patches().then((patches) => {
            assert.equal(patches.length, 3);
        });
    });

    it("can pass undefined pathspec as option to indexToWorkdir", function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;

            return repository.refreshIndex();
        }).then((index) => {
            test.index = index;

            return test.repository.getBranchCommit("master");
        }).then(() => {
            const opts = {
                flags: Diff.OPTION.INCLUDE_UNTRACKED |
                Diff.OPTION.RECURSE_UNTRACKED_DIRS,
                pathspec: undefined
            };

            // should not segfault
            return Diff.indexToWorkdir(test.repository, test.index, opts);
        });
    });


    it("can merge two commit diffs", function () {
        let linesOfFirstDiff;
        let linesOfSecondDiff;
        const firstDiff = this.diff[0];
        let secondDiff;
        const oid = "c88d39e70585199425b111c6a2c7fa7b4bc617ad";
        return this.repository.getCommit(oid).then((testCommit) => {
            return testCommit.getDiff();
        }).then((_secondDiff) => {
            secondDiff = _secondDiff[0];
            return Promise.all([
                getLinesFromDiff(firstDiff),
                getLinesFromDiff(secondDiff)
            ]);
        }).then((listOfLines) => {
            linesOfFirstDiff = listOfLines[0];
            linesOfSecondDiff = listOfLines[1];
            return firstDiff.merge(secondDiff);
        }).then(() => {
            return getLinesFromDiff(firstDiff);
        }).then((linesOfMergedDiff) => {
            const allDiffLines = _.flatten([
                linesOfFirstDiff,
                linesOfSecondDiff
            ]);
            _.forEach(allDiffLines, (diffLine) => {
                assert.ok(_.includes(linesOfMergedDiff, diffLine));
            });
        });
    });

    describe.skip("merge between commit diff and workdir and index diff", () => {
        beforeEach(function () {
            const test = this;
            const diffOptions = new DiffOptions();
            const IGNORE_CASE_FLAG = 1 << 10;
            diffOptions.flags = diffOptions.flags |= IGNORE_CASE_FLAG;
            return fs.writeFile(path.join(test.repository.workdir(), "newFile.txt"), "some line\n").then(() => {
                return test.index.addAll(undefined, undefined, () => {
                    // ensure that there is no deadlock if we call
                    // a sync libgit2 function from the callback
                    test.repository.path();

                    return 0; // confirm add
                });
            }).then(() => {
                return test.repository.getHeadCommit();
            }).then((headCommit) => {
                return headCommit.getTree();
            }).then((headTree) => {
                return Promise.all([
                    Diff.treeToWorkdirWithIndex(test.repository, headTree, diffOptions),
                    test.commit.getDiffWithOptions(diffOptions)
                ]);
            }).then((diffs) => {
                test.workDirWithIndexDiff = diffs[0];
                // The second item in `diffs` is the commit diff which contains and
                // array of diffs, one for each parent
                test.commitDiff = diffs[1][0];
            });
        });

        it("can merge a diff from a commit into a diff from a work dir and index", function () {
            const test = this;
            let linesOfWorkDirWithIndexDiff;
            let linesOfCommitDiff;
            return Promise.all([
                getLinesFromDiff(test.workDirWithIndexDiff),
                getLinesFromDiff(test.commitDiff)
            ]).then((linesOfDiffs) => {
                linesOfWorkDirWithIndexDiff = linesOfDiffs[0];
                linesOfCommitDiff = linesOfDiffs[1];
                return test.workDirWithIndexDiff.merge(test.commitDiff);
            }).then(() => {
                return getLinesFromDiff(test.workDirWithIndexDiff);
            }).then((linesOfMergedDiff) => {
                const allDiffLines = _.flatten([
                    linesOfWorkDirWithIndexDiff,
                    linesOfCommitDiff
                ]);
                _.forEach(allDiffLines, (diffLine) => {
                    assert.true(_.includes(linesOfMergedDiff, diffLine));
                });
            });
        });

        it("can merge a diff from a workdir and index into a diff from a commit", function () {
            const test = this;
            let linesOfWorkDirWithIndexDiff;
            let linesOfCommitDiff;
            return Promise.all([
                getLinesFromDiff(test.workDirWithIndexDiff),
                getLinesFromDiff(test.commitDiff)
            ]).then((linesOfDiffs) => {
                linesOfWorkDirWithIndexDiff = linesOfDiffs[0];
                linesOfCommitDiff = linesOfDiffs[1];
                return test.commitDiff.merge(test.workDirWithIndexDiff);
            }).then(() => {
                return getLinesFromDiff(test.commitDiff);
            }).then((linesOfMergedDiff) => {
                const allDiffLines = _.flatten([
                    linesOfWorkDirWithIndexDiff,
                    linesOfCommitDiff
                ]);
                _.forEach(allDiffLines, (diffLine) => {
                    assert.true(_.includes(linesOfMergedDiff, diffLine));
                });
            });
        });
    });

    // This wasn't working before. It was only passing because the promise chain
    // was broken
    it.skip("can find similar files in a diff", function () {
        const diff = this.indexToWorkdirDiff;
        const opts = {
            flags: Diff.FIND.RENAMES |
            Diff.FIND.RENAMES_FROM_REWRITES |
            Diff.FIND.FOR_UNTRACKED
        };

        return diff.patches().then((patches) => {
            assert.equal(patches.length, 3);

            return diff.findSimilar(opts);
        }).then(() => {
            return diff.patches();
        }).then((patches) => {
            // Renamed file now treated as one diff, so 3 patches -> 2
            assert.equal(patches.length, 2);
        });
    });
});
