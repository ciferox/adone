import RepoUtils from "./utils/repository_setup";
const {
    fs,
    std: { path },
    vcs: { git: { Diff, Signature } },
    system: { process: { shell } }
} = adone;

// var exec = require("../../utils/execPromise");

describe("Stage", () => {
    let test;

    beforeEach(function () {
        test = this;
        const repoDir = "repos/stagingRepo/";
        const repoPath = path.resolve(__dirname, "fixtures", repoDir);

        return RepoUtils.createRepository(repoPath).then((repo) => {
            test.repository = repo;
        });
    });

    after(() => {
        return fs.rm(test.repository.workdir());
    });

    const stagingTest = (isUnstaged, newFileContent, discarding) => {
        const fileContent = newFileContent ||
            "One line of text\n" +
            "Two lines of text\n" +
            "Three lines of text\n" +
            "Four lines of text\n" +
            "Five lines of text\n" +
            "Six lines of text\n" +
            "Seven lines of text\n" +
            "Eight lines of text\n" +
            "Nine lines of text\n" +
            "Ten lines of text\n" +
            "Eleven lines of text\n" +
            "Twelve lines of text\n" +
            "Thirteen lines of text\n" +
            "Fourteen lines of text\n" +
            "Fifteen lines of text\n" +
            "Sixteen lines of text\n" +
            "Seventeen lines of text\n" +
            "Eighteen lines of text\n" +
            "Nineteen lines of text\n" +
            "Twenty lines of text\n";
        const fileName = "stagedLinesTest.txt";
        let expectedContent;
        let workingDirFile;
        let getDiffFunction;

        if (!isUnstaged || discarding) {
            expectedContent = fileContent.replace("Three", "Changed three").replace("Seventeen", "Changed seventeen");
            workingDirFile = expectedContent.replace("Fifteen", "Changed fifteen");
        } else {
            expectedContent = fileContent.replace("Fifteen", "Changed fifteen");
            workingDirFile = expectedContent.replace("Three", "Changed three").replace("Seventeen", "Changed seventeen");
        }

        if (isUnstaged) {
            getDiffFunction = function () {
                return test.repository.refreshIndex().then((index) => {
                    return Diff.indexToWorkdir(test.repository, index, {
                        flags:
                        Diff.OPTION.SHOW_UNTRACKED_CONTENT |
                        Diff.OPTION.RECURSE_UNTRACKED_DIRS
                    });
                });
            };
        } else {
            getDiffFunction = function () {
                return RepoUtils.addFileToIndex(test.repository, fileName).then(() => {
                    return test.repository.getBranchCommit("master");
                }).then((masterCommit) => {
                    const treePromise = masterCommit.getTree();
                    const indexPromise = test.repository.refreshIndex();

                    return Promise.all([treePromise, indexPromise]);
                }).then((treeAndIndex) => {
                    const masterTree = treeAndIndex[0];
                    const index = treeAndIndex[1];
                    return Diff.treeToIndex(test.repository, masterTree, index, {
                        flags:
                        Diff.OPTION.SHOW_UNTRACKED_CONTENT |
                        Diff.OPTION.RECURSE_UNTRACKED_DIRS
                    });
                });
            };
        }

        return RepoUtils.commitFileToRepo(test.repository, fileName, fileContent).then(() => {
            return fs.writeFile(path.join(test.repository.workdir(), fileName), workingDirFile);
        }).then(() => {
            return getDiffFunction();
        }).then((fileDiff) => {
            return fileDiff.patches();
        }).then((patches) => {
            const pathPatch = patches.filter((patch) => {
                return patch.newFile().path() === fileName;
            });
            return pathPatch[0].hunks();
        }).then((pathHunks) => {
            const linePromises = [];

            pathHunks.forEach((pathHunk) => {
                linePromises.push(pathHunk.lines());
            });

            return Promise.all(linePromises);
        }).then((lines) => {
            const linesToStage = [];
            lines.forEach((hunkLines) => {
                hunkLines.forEach((line) => {
                    if (line.content().toLowerCase().indexOf("fifteen") >= 0) {
                        linesToStage.push(line);
                    }
                });
            });

            if (discarding) {
                return test.repository.discardLines(fileName, linesToStage);
            }

            return test.repository.stageLines(fileName, linesToStage, !isUnstaged);
        }).then(() => {
            if (discarding) {
                return fs.readFile(path.join(test.repository.workdir(), fileName), { encoding: "utf8" });
            }

            return test.repository.refreshIndex().then((reloadedIndex) => {
                const pathOid = reloadedIndex.getByPath(fileName).id;
                return test.repository.getBlob(pathOid);
            });
        }).then((resultFileContents) => {
            assert.equal(resultFileContents.toString(), expectedContent);
        });
    };

    it("can stage selected lines", () => {
        return stagingTest(true);
    });
    it("can unstage selected lines", () => {
        return stagingTest(false);
    });

    //This is used to test cases where there are no newline at EOF
    const newlineEofTestFileContent =
        "One line of text\n" +
        "Two lines of text\n" +
        "Three lines of text\n" +
        "Four lines of text\n" +
        "Five lines of text\n" +
        "Six lines of text\n" +
        "Seven lines of text\n" +
        "Eight lines of text\n" +
        "Nine lines of text\n" +
        "Ten lines of text\n" +
        "Eleven lines of text\n" +
        "Twelve lines of text\n" +
        "Thirteen lines of text\n" +
        "Fourteen lines of text\n" +
        "Fifteen lines of text";
    it("can stage last line with no newline at EOF", () => {
        return stagingTest(true, newlineEofTestFileContent);
    });
    it("can unstage last line with no newline at EOF", () => {
        return stagingTest(false, newlineEofTestFileContent);
    });
    it("can stage second to last line with no newline at EOF", () => {
        const newlineEofTestFileContent2 = `${newlineEofTestFileContent}\nSixteen lines of text\nSeventeen lines of text\nEighteen lines of text`;
        return stagingTest(true, newlineEofTestFileContent2);
    });
    it("can unstage second to last line with no newline at EOF", () => {
        const newlineEofTestFileContent2 = `${newlineEofTestFileContent}\nSixteen lines of text\nSeventeen lines of text\nEighteen lines of text`;
        return stagingTest(false, newlineEofTestFileContent2);
    });

    //This is used to test case where the last hunk is staged.
    const lastHunkStagedFileContent =
        "Thirteen lines of text\n" +
        "Fourteen lines of text\n" +
        "Fifteen lines of text\n" +
        "Sixteen lines of text\n" +
        "Shforteenteen lines of text\n";

    it("staging last hunk stages whole file if no filemode changes", () => {
        return stagingTest(true, lastHunkStagedFileContent).then(() => {
            return test.repository.refreshIndex();
        }).then((index) => {
            return Diff.indexToWorkdir(test.repository, index, {
                flags:
                Diff.OPTION.SHOW_UNTRACKED_CONTENT |
                Diff.OPTION.RECURSE_UNTRACKED_DIRS
            });
        }).then((diff) => {
            assert.equal(Object.keys(diff).length, 0); // Empty diff
            return diff.patches();
        }).then((patches) => {
            //patches will have at least one item if there is something unstaged
            assert.equal(patches.length, 0);
        });
    });

    const compareFilemodes = (vsWorkdir, index, fileModeDifference) => {
        //Takes diff of head commit vs Workdir (if vsWorkdir is set) or vs Index
        //(if vsWorkdir is unset). Note: there's only one file in the filemode
        //staging tests for which this helper fn was written.
        //index - index to use (vsWorkdir is unset)
        //fileModeDifference - expected (newfilemode) - (oldfilemode)
        return test.repository.getHeadCommit().then((commit) => {
            return commit.getTree();
        }).then((tree) => {
            if (vsWorkdir) {
                return Diff.treeToWorkdir(test.repository, tree);
            }
            return Diff.treeToIndex(test.repository, tree, index);
        }).then((diff) => {
            return diff.getDelta(0);
        }).then((delta) => {
            if (fileModeDifference === 0) {
                if (!delta) {
                    return true;
                }
                throw new Error("File change when no file change expected.");
            } else {
                assert(delta.newFile().mode() - delta.oldFile().mode() === fileModeDifference);
            }
            return true;
        });
    };

    const createAndCommitFiles = (repo, filePaths, fileContent, afterWriteFn) => {
        filePaths = filePaths instanceof Array ? filePaths : [filePaths];
        const filePromises = filePaths.map((fileName) => {
            return RepoUtils.commitFileToRepo(repo, fileName, fileContent).then(() => {
                //First, create a file, have the same file in both the repo and workdir.
                return fs.writeFile(path.join(repo.workdir(), fileName), fileContent);
            }).then(() => {
                return afterWriteFn(repo, fileName);
            });
        });

        return Promise.all(filePromises);
    };

    if (process.platform === "linux" || process.platform === "darwin") {
        it("can stage filemode changes for one file", () => {
            const fileContent = "Blek";
            const fileName = "stageFilemodeTest.txt";
            let index;

            const afterWriteFn = (repo, fileName) => fs.chmod(path.join(repo.workdir(), fileName), 0o755 /* new filemode */);

            return createAndCommitFiles(test.repository, fileName, fileContent, afterWriteFn)
                //Then, diff between head commit and workdir should have filemode change
                .then(() => {
                    return compareFilemodes(true, null, 0o111 /* expect +x */).then(() => {
                        return test.repository.stageFilemode(fileName, true);
                    });
                })
                //Now lets do a commit...
                .then(() => {
                    return test.repository.refreshIndex();
                })
                .then((_index) => {
                    index = _index;
                    return index.writeTree();
                })
                .then((oid) => {
                    return test.repository.getHeadCommit()
                        .then((parent) => {
                            const signature = Signature.create("Foo bar", "foo@bar.com", 123456789, 60);
                            return test.repository.createCommit("HEAD", signature, signature, "initial commit", oid, [parent]);
                        });
                    //... alright, we did a commit.
                })
                // Now if we compare head commit to the workdir,
                // there shouldn't be a filemode change
                .then(() => {
                    return compareFilemodes(true, null, 0);
                });
        });

        it("can unstage filemode changes", () => {
            const fileContent = "Blek";
            const fileName = "stageFilemodeTest2.txt";
            let index;

            const afterWriteFn = (repo, fileName) => fs.chmod(path.join(repo.workdir(), fileName), 0o755 /* new filemode */);

            return createAndCommitFiles(
                test.repository,
                fileName,
                fileContent,
                afterWriteFn
            )
                //Then, diff between head commit and workdir should have filemode change
                .then(() => {
                    return compareFilemodes(true, null, 0o111 /* expect +x */);
                })
                .then(() => {
                    return test.repository.refreshIndex();
                })
                .then((repoIndex) => {
                    //Now we stage the whole file...
                    index = repoIndex;
                    return index.addByPath(fileName);
                })
                .then(() => {
                    return index.write();
                })
                .then(() => {
                    //We expect the Index to have the filemode changes now.
                    return compareFilemodes(false, index, 0o111 /* expect +x */)
                        .then(() => {
                            //...then we attempt to unstage filemode
                            return test.repository.stageFilemode(fileName, false /* unstage */);
                        });
                })
                .then(() => {
                    return test.repository.refreshIndex();
                })
                //We expect the Index to have no filemode changes, since we unstaged.
                .then((freshIndex) => {
                    return compareFilemodes(false, freshIndex, 0 /* expect +x */);
                })
                //We also expect the workdir to now have the filemode change.
                .then(() => {
                    return compareFilemodes(true, null, 0o111 /* expect +x */);
                });
        });
    } else if (process.platform === "win32") {
        it("can stage/unstage filemode changes for one file", () => {
            const fileContent = "Blek";
            const fileName = "stageFilemodeTest.txt";
            let index;

            const afterWriteFn = (repo, fileName) => {
                //change the permission on index
                return shell(`git update-index --chmod=+x ${fileName}`, { cwd: repo.workdir() }).then(() => {
                    //Commit the change with execute bit set
                    return shell("git commit -m 'test'", { cwd: repo.workdir() });
                }).then(() => {
                    //Then, change the permission on index
                    return shell(`git update-index --chmod=-x ${fileName}`, { cwd: repo.workdir() });
                });
            };

            return createAndCommitFiles(test.repository, fileName, fileContent, afterWriteFn).then(() => {
                return test.repository.refreshIndex();
            }).then((repoIndex) => {
                index = repoIndex;
                //Head commit vs index
                //We expect the Index to have +x
                return compareFilemodes(false, index, -0o111 /* expect +x */);
            }).then(() => {
                //...then we attempt to unstage filemode
                return test.repository.stageFilemode(fileName, false /* unstage */);
            }).then(() => {
                return test.repository.refreshIndex();
            }).then((freshIndex) => {
                return compareFilemodes(false, freshIndex, 0 /* expect nochange */);
            });
        });
    }

    it("can stage/unstage filemode changes for multiple files", () => {
        const fileContent = "Blek";
        const fileName = ["stageFilemodeTest.txt", "stageFilemodeTest2.txt"];
        let index;

        const repoWorkDir = test.repository.workdir();
        const signature = Signature.create("Foo bar", "foo@bar.com", 123456789, 60);

        return Promise.all(fileName.map((file) => {
            return fs.writeFile(path.join(repoWorkDir, file), fileContent);
        })).then(() => {
            // Initial commit
            return test.repository.refreshIndex();
        }).then((index) => {
            return fileName.reduce((lastPromise, file) => {
                return lastPromise.then(function () {
                    return index.addByPath(file);
                });
            }, Promise.resolve()).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            return test.repository.createCommit("HEAD", signature, signature, "initial commit", oid, []);
        }).then((commitOid) => {
            return test.repository.getCommit(commitOid);
        }).then(() => {
            //change the permission on index
            return shell(`git update-index --chmod=+x ${fileName[0]}`, { cwd: test.repository.workdir() });
        }).then(() => {
            //change the permission on index
            return shell(`git update-index --chmod=+x ${fileName[1]}`, { cwd: test.repository.workdir() });
        }).then(() => {
            //Commit the change with execute bit set
            return shell("git commit -m 'test'", { cwd: test.repository.workdir() });
        }).then(() => {
            //Then, change the permission on index back to -x
            return shell(`git update-index --chmod=-x ${fileName[0]}`, { cwd: test.repository.workdir() });
        }).then(() => {
            //Then, change the permission on index back to -x
            return shell(`git update-index --chmod=-x ${fileName[1]}`, { cwd: test.repository.workdir() });
        }).then(() => {
            return test.repository.refreshIndex();
        }).then((repoIndex) => {
            index = repoIndex;
            //Head commit vs index
            //We expect the Index to have +x
            return compareFilemodes(false, index, -0o111 /* expect +x */);
        }).then(() => {
            //...then we attempt to unstage filemode
            return test.repository.stageFilemode(fileName, false /* unstage */);
        }).then(() => {
            return test.repository.refreshIndex();
        }).then((freshIndex) => {
            return compareFilemodes(false, freshIndex, 0 /* expect nochange */);
        });
    });

    it("can discard selected lines", () => {
        return stagingTest(true, null, true);
    });
});
