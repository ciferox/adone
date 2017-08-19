import RepoUtils from "./utils/repository_setup";

const {
    fs,
    std: { path },
    vcs: { git: { AnnotatedCommit, Checkout, Rebase, RebaseOperation, Signature } }
} = adone;
const local = path.join.bind(path, __dirname, "fixtures");

describe("Rebase", () => {
    const repoPath = local("repos/rebase");
    const ourBranchName = "ours";
    const theirBranchName = "theirs";

    const removeFileFromIndex = function (repository, fileName) {
        return repository.refreshIndex().then((index) => {
            return index.removeByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        });
    };

    beforeEach(function () {
        const test = this;
        return RepoUtils.createRepository(repoPath).then((repo) => {
            test.repository = repo;
        });
    });

    after(() => {
        return fs.rm(repoPath);
    });

    it("can cleanly fast-forward via rebase", function () {
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let theirBranch;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent).then(() => {
            return RepoUtils.addFileToIndex(repository, ourFileName);
        }).then((oid) => {
            assert.equal(oid.toString(),
                "11ead82b1135b8e240fb5d61e703312fb9cc3d6a");

            return repository.createCommit("HEAD", ourSignature,
                ourSignature, "we made a commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "91a183f87842ebb7a9b08dad8bc2473985796844");

            return repository.getCommit(commitOid).then((commit) => {
                ourCommit = commit;
            }).then(() => {
                return repository.createBranch(ourBranchName, commitOid).then((branch) => {
                    return repository.createBranch(theirBranchName, commitOid);
                });
            });
        }).then((branch) => {
            theirBranch = branch;
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, theirFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "76631cb5a290dafe2959152626bb90f2a6d8ec94");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");
        }).then(() => {
            // unstage changes so that we can begin a rebase
            return removeFileFromIndex(repository, theirFileName);
        }).then(() => {
            return Promise.all([
                repository.getReference(ourBranchName),
                repository.getReference(theirBranchName)
            ]);
        }).then((refs) => {
            assert.equal(refs.length, 2);

            return Promise.all([
                AnnotatedCommit.fromRef(repository, refs[0]),
                AnnotatedCommit.fromRef(repository, refs[1])
            ]);
        }).then((annotatedCommits) => {
            assert.equal(annotatedCommits.length, 2);

            const ourAnnotatedCommit = annotatedCommits[0];
            const theirAnnotatedCommit = annotatedCommits[1];

            assert.equal(ourAnnotatedCommit.id().toString(), "91a183f87842ebb7a9b08dad8bc2473985796844");
            assert.equal(theirAnnotatedCommit.id().toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");

            return Rebase.init(repository, ourAnnotatedCommit, theirAnnotatedCommit, theirAnnotatedCommit);
        }).then((rebase) => {
            assert.equal(rebase.operationEntrycount(), 0);

            return rebase.finish(ourSignature);
        }).then(() => {
            return repository.getBranchCommit(ourBranchName);
        }).then((commit) => {
            assert.equal(commit.id().toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");
        });
    });

    it("can cleanly rebase a branch onto another branch", function () {
        const baseFileName = "baseNewFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const baseFileContent = "How do you feel about Toll Roads?";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let ourBranch;
        let theirBranch;
        let rebase;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), baseFileName), baseFileContent).then(() => {
            return RepoUtils.addFileToIndex(repository, baseFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "b5cdc109d437c4541a13fb7509116b5f03d5039a");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "be03abdf0353d05924c53bebeb0e5bb129cda44a");

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
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, theirFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "be5f0fd38a39a67135ad68921c93cd5c17fefb3d");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");

            return removeFileFromIndex(repository, theirFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), theirFileName));
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, ourFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "77867fc0bfeb3f80ab18a78c8d53aa3a06207047");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "e7f37ee070837052937e24ad8ba66f6d83ae7941");

            return removeFileFromIndex(repository, ourFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), ourFileName));
        }).then(() => {
            return repository.checkoutBranch(ourBranchName);
        }).then(() => {
            return Promise.all([
                repository.getReference(ourBranchName),
                repository.getReference(theirBranchName)
            ]);
        }).then((refs) => {
            assert.equal(refs.length, 2);

            return Promise.all([
                AnnotatedCommit.fromRef(repository, refs[0]),
                AnnotatedCommit.fromRef(repository, refs[1])
            ]);
        }).then((annotatedCommits) => {
            assert.equal(annotatedCommits.length, 2);

            const ourAnnotatedCommit = annotatedCommits[0];
            const theirAnnotatedCommit = annotatedCommits[1];

            assert.equal(ourAnnotatedCommit.id().toString(), "e7f37ee070837052937e24ad8ba66f6d83ae7941");
            assert.equal(theirAnnotatedCommit.id().toString(), "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");

            return Rebase.init(repository, ourAnnotatedCommit,
                theirAnnotatedCommit, null);
        }).then((newRebase) => {
            rebase = newRebase;

            // there should only be 1 rebase operation to perform
            assert.equal(rebase.operationEntrycount(), 1);

            return rebase.next();
        }).then((rebaseOperation) => {
            assert.equal(rebaseOperation.type(), RebaseOperation.REBASE_OPERATION.PICK);
            assert.equal(rebaseOperation.id().toString(), "e7f37ee070837052937e24ad8ba66f6d83ae7941");

            return rebase.commit(null, ourSignature);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "b937100ee0ea17ef20525306763505a7fe2be29e");

            // git_rebase_operation_current returns the index of the rebase
            // operation that was last applied, so after the first operation, it
            // should be 0.
            assert.equal(rebase.operationCurrent(), 0);

            return rebase.finish(ourSignature, {});
        }).then((result) => {
            assert.equal(result, 0);

            return repository.getBranchCommit(ourBranchName);
        }).then((commit) => {
            // verify that the "ours" branch has moved to the correct place
            assert.equal(commit.id().toString(), "b937100ee0ea17ef20525306763505a7fe2be29e");

            return commit.parent(0);
        }).then((commit) => {
            // verify that we are on top of "their commit"
            assert.equal(commit.id().toString(), "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");
        });
    });

    it("can rebase 2 branches with conflicts on a single file", function () {
        const fileName = "everyonesFile.txt";

        const baseFileContent = "How do you feel about Toll Roads?\n";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!\n";
        const theirFileContent = "I'm skeptical about Toll Roads\n";

        const expectedConflictedFileContent =
            "How do you feel about Toll Roads?\n" +
            "<<<<<<< theirs\n" +
            "I'm skeptical about Toll Roads\n" +
            "=======\n" +
            "I like Toll Roads. I have an EZ-Pass!\n" +
            ">>>>>>> we made a commit\n";

        const conflictSolvedFileContent =
            "How do you feel about Toll Roads?\n" +
            "He's skeptical about Toll Roads,\n" +
            "but I like Toll Roads. I have an EZ-Pass!\n";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let ourBranch;
        let theirBranch;
        let rebase;

        return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "044704f62399fecbe22da6d7d47b14e52625630e");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "80111c46ac73b857a3493b24c81df08639b5de99");

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

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
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
            return Promise.all([
                repository.getReference(ourBranchName),
                repository.getReference(theirBranchName)
            ]);
        }).then((refs) => {
            assert.equal(refs.length, 2);

            return Promise.all([
                AnnotatedCommit.fromRef(repository, refs[0]),
                AnnotatedCommit.fromRef(repository, refs[1])
            ]);
        }).then((annotatedCommits) => {
            assert.equal(annotatedCommits.length, 2);

            const ourAnnotatedCommit = annotatedCommits[0];
            const theirAnnotatedCommit = annotatedCommits[1];

            assert.equal(ourAnnotatedCommit.id().toString(), "28cfeb17f66132edb3c4dacb7ff38e8dd48a1844");
            assert.equal(theirAnnotatedCommit.id().toString(), "b3c355bb606ec7da87174dfa1a0b0c0e3dc97bc0");

            return Rebase.init(repository, ourAnnotatedCommit, theirAnnotatedCommit, null);
        }).then((newRebase) => {
            rebase = newRebase;

            // there should only be 1 rebase operation to perform
            assert.equal(rebase.operationEntrycount(), 1);

            return rebase.next();
        }).then((rebaseOperation) => {
            assert.equal(rebaseOperation.type(), RebaseOperation.REBASE_OPERATION.PICK);
            assert.equal(rebaseOperation.id().toString(), "28cfeb17f66132edb3c4dacb7ff38e8dd48a1844");

            return repository.refreshIndex().then((index) => {
                assert.ok(index.hasConflicts());
            });
        }).then(() => {
            return fs.readFile(path.join(repository.workdir(), fileName), { encoding: "utf8" }).then((fileContent) => {
                assert.equal(fileContent, expectedConflictedFileContent);

                return fs.writeFile(path.join(repository.workdir(), fileName), conflictSolvedFileContent);
            });
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            return repository.refreshIndex().then((index) => {
                assert.ok(!index.hasConflicts());

                return rebase.commit(null, ourSignature);
            });
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "ef6d0e95167435b3d58f51ab165948c72f6f94b6");

            return rebase.finish(ourSignature);
        }).then((result) => {
            assert.equal(result, 0);

            return repository.getBranchCommit(ourBranchName);
        }).then((commit) => {
            // verify that the "ours" branch has moved to the correct place
            assert.equal(commit.id().toString(), "ef6d0e95167435b3d58f51ab165948c72f6f94b6");

            return commit.parent(0);
        }).then((commit) => {
            // verify that we are on top of "their commit"
            assert.equal(commit.id().toString(), "b3c355bb606ec7da87174dfa1a0b0c0e3dc97bc0");
        });
    });

    it("can abort an in-progress rebase", function () {
        const baseFileName = "baseNewFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const baseFileContent = "How do you feel about Toll Roads?";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let ourBranch;
        let theirBranch;
        let rebase;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), baseFileName), baseFileContent).then(() => {
            return RepoUtils.addFileToIndex(repository, baseFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "b5cdc109d437c4541a13fb7509116b5f03d5039a");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "be03abdf0353d05924c53bebeb0e5bb129cda44a");

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
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, theirFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "be5f0fd38a39a67135ad68921c93cd5c17fefb3d");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");

            return removeFileFromIndex(repository, theirFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), theirFileName));
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, ourFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "77867fc0bfeb3f80ab18a78c8d53aa3a06207047");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "e7f37ee070837052937e24ad8ba66f6d83ae7941");

            return removeFileFromIndex(repository, ourFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), ourFileName));
        }).then(() => {
            return repository.checkoutBranch(ourBranchName);
        }).then(() => {
            return Promise.all([
                repository.getReference(ourBranchName),
                repository.getReference(theirBranchName)
            ]);
        }).then((refs) => {
            assert.equal(refs.length, 2);

            return Promise.all([
                AnnotatedCommit.fromRef(repository, refs[0]),
                AnnotatedCommit.fromRef(repository, refs[1])
            ]);
        }).then((annotatedCommits) => {
            assert.equal(annotatedCommits.length, 2);

            const ourAnnotatedCommit = annotatedCommits[0];
            const theirAnnotatedCommit = annotatedCommits[1];

            assert.equal(ourAnnotatedCommit.id().toString(), "e7f37ee070837052937e24ad8ba66f6d83ae7941");
            assert.equal(theirAnnotatedCommit.id().toString(), "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");

            return Rebase.init(repository, ourAnnotatedCommit, theirAnnotatedCommit, null);
        }).then((newRebase) => {
            rebase = newRebase;

            // there should only be 1 rebase operation to perform
            assert.equal(rebase.operationEntrycount(), 1);

            return rebase.next();
        }).then((rebaseOperation) => {
            assert.equal(rebaseOperation.type(), RebaseOperation.REBASE_OPERATION.PICK);
            assert.equal(rebaseOperation.id().toString(), "e7f37ee070837052937e24ad8ba66f6d83ae7941");

            return rebase.commit(null, ourSignature);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "b937100ee0ea17ef20525306763505a7fe2be29e");

            return repository.getBranchCommit("HEAD").then((commit) => {
                // verify that HEAD is on the rebased commit
                assert.equal(commit.id().toString(), commitOid.toString());
            });
        }).then(() => {
            return rebase.abort();
        }).then(() => {
            return Rebase.open(repository).then((existingRebase) => {
                assert.fail(existingRebase, undefined, "There should not be a rebase in progress");
            }).catch((e) => {
                assert.equal(e.message, "there is no rebase in progress");
            });
        }).then(() => {
            return Promise.all([
                repository.getBranchCommit("HEAD"),
                repository.getBranchCommit(ourBranchName)
            ]);
        }).then((commits) => {
            assert.equal(commits.length, 2);

            // verify that 'HEAD' and 'ours' are back to their pre-rebase state
            assert.equal(commits[0].id().toString(), "e7f37ee070837052937e24ad8ba66f6d83ae7941");
            assert.equal(commits[1].id().toString(), "e7f37ee070837052937e24ad8ba66f6d83ae7941");
        });
    });

    it("can fast-forward via rebase using the convenience methods",
        function () {
            const ourFileName = "ourNewFile.txt";
            const theirFileName = "theirNewFile.txt";

            const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
            const theirFileContent = "I'm skeptical about Toll Roads";

            const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
            const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

            const repository = this.repository;
            let ourCommit;
            let theirBranch;

            // Load up the repository index and make our initial commit to HEAD
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent).then(() => {
                return RepoUtils.addFileToIndex(repository, ourFileName);
            }).then((oid) => {
                assert.equal(oid.toString(), "11ead82b1135b8e240fb5d61e703312fb9cc3d6a");

                return repository.createCommit("HEAD", ourSignature, ourSignature, "we made a commit", oid, []);
            }).then((commitOid) => {
                assert.equal(commitOid.toString(), "91a183f87842ebb7a9b08dad8bc2473985796844");

                return repository.getCommit(commitOid).then((commit) => {
                    ourCommit = commit;
                }).then(() => {
                    return repository.createBranch(ourBranchName, commitOid).then((branch) => {
                        return repository.createBranch(theirBranchName, commitOid);
                    });
                });
            }).then((branch) => {
                theirBranch = branch;
                return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
            }).then(() => {
                return RepoUtils.addFileToIndex(repository, theirFileName);
            }).then((oid) => {
                assert.equal(oid.toString(), "76631cb5a290dafe2959152626bb90f2a6d8ec94");

                return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
            }).then((commitOid) => {
                assert.equal(commitOid.toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");
            }).then(() => {
                // unstage changes so that we can begin a rebase
                return removeFileFromIndex(repository, theirFileName);
            }).then(() => {
                return Promise.all([
                    repository.getReference(ourBranchName),
                    repository.getReference(theirBranchName)
                ]);
            }).then((refs) => {
                assert.equal(refs.length, 2);

                return Promise.all([
                    AnnotatedCommit.fromRef(repository, refs[0]),
                    AnnotatedCommit.fromRef(repository, refs[1])
                ]);
            }).then((annotatedCommits) => {
                assert.equal(annotatedCommits.length, 2);

                const ourAnnotatedCommit = annotatedCommits[0];
                const theirAnnotatedCommit = annotatedCommits[1];

                assert.equal(ourAnnotatedCommit.id().toString(), "91a183f87842ebb7a9b08dad8bc2473985796844");
                assert.equal(theirAnnotatedCommit.id().toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");

                return fs.rm(path.join(repository.workdir(), theirFileName));
            }).then(() => {
                return repository.rebaseBranches(ourBranchName, theirBranchName, null, ourSignature);
            }).then((commit) => {
                assert.equal(commit.id().toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");
            });
        });

    it("can rebase using the convenience method", function () {
        const baseFileName = "baseNewFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const baseFileContent = "How do you feel about Toll Roads?";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let ourBranch;
        let theirBranch;

        let nextCalls = 0;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), baseFileName), baseFileContent).then(() => {
            return RepoUtils.addFileToIndex(repository, baseFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "b5cdc109d437c4541a13fb7509116b5f03d5039a");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "be03abdf0353d05924c53bebeb0e5bb129cda44a");

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
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, theirFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "be5f0fd38a39a67135ad68921c93cd5c17fefb3d");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");

            return removeFileFromIndex(repository, theirFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), theirFileName));
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, ourFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "77867fc0bfeb3f80ab18a78c8d53aa3a06207047");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "e7f37ee070837052937e24ad8ba66f6d83ae7941");

            return removeFileFromIndex(repository, ourFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), ourFileName));
        }).then(() => {
            return repository.checkoutBranch(ourBranchName);
        }).then(() => {
            return repository.rebaseBranches(ourBranchName, theirBranchName, null, ourSignature, (rebase) => {
                assert.ok(rebase instanceof Rebase);

                nextCalls++;

                return Promise.resolve();
            });
        }).then((commit) => {
            // verify that the beforeNextFn callback was called
            assert.equal(nextCalls, 2);

            // verify that the "ours" branch has moved to the correct place
            assert.equal(commit.id().toString(), "b937100ee0ea17ef20525306763505a7fe2be29e");

            return commit.parent(0);
        }).then((commit) => {
            // verify that we are on top of "their commit"
            assert.equal(commit.id().toString(), "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");
        });
    });

    it("beforeFinishFn sync callback receives correct rebase data", function () {
        const baseFileName = "baseNewFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const baseFileContent = "How do you feel about Toll Roads?";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let ourBranch;
        let theirBranch;
        let ourBranchShaPreRebase;
        const ourBranchShaPostRebase = "b937100ee0ea17ef20525306763505a7fe2be29e";
        let theirBranchSha;

        let nextCalls = 0;

        let calledBeforeFinishFn = false;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), baseFileName), baseFileContent).then(() => {
            return RepoUtils.addFileToIndex(repository, baseFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "b5cdc109d437c4541a13fb7509116b5f03d5039a");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "be03abdf0353d05924c53bebeb0e5bb129cda44a");

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
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, theirFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "be5f0fd38a39a67135ad68921c93cd5c17fefb3d");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            theirBranchSha = commitOid.toString();
            assert.equal(theirBranchSha, "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");

            return removeFileFromIndex(repository, theirFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), theirFileName));
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, ourFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "77867fc0bfeb3f80ab18a78c8d53aa3a06207047");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            ourBranchShaPreRebase = commitOid.toString();
            assert.equal(ourBranchShaPreRebase, "e7f37ee070837052937e24ad8ba66f6d83ae7941");

            return removeFileFromIndex(repository, ourFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), ourFileName));
        }).then(() => {
            return repository.checkoutBranch(ourBranchName);
        }).then(() => {
            return repository.rebaseBranches(ourBranchName, theirBranchName, null, ourSignature, (rebase) => {
                assert.ok(rebase instanceof Rebase);

                nextCalls++;

                return Promise.resolve();
            }, (rebaseMetadata) => {
                calledBeforeFinishFn = true;

                assert.equal(rebaseMetadata.ontoName, theirBranchName);
                assert.equal(rebaseMetadata.ontoSha, theirBranchSha);
                assert.equal(rebaseMetadata.originalHeadName, ourBranchName);
                assert.equal(
                    rebaseMetadata.originalHeadSha,
                    ourBranchShaPreRebase
                );
                assert.deepEqual(
                    rebaseMetadata.rewritten,
                    [[ourBranchShaPreRebase, ourBranchShaPostRebase]]
                );
            });
        }).then((commit) => {
            // verify that the beforeNextFn callback was called
            assert.equal(nextCalls, 2);

            // verify that the beforeFinishFn callback was called
            assert(calledBeforeFinishFn, "beforeFinishFn was not called");

            // verify that the "ours" branch has moved to the correct place
            assert.equal(commit.id().toString(), ourBranchShaPostRebase);

            return commit.parent(0);
        }).then((commit) => {
            // verify that we are on top of "their commit"
            assert.equal(commit.id().toString(), "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");
        });
    });

    it("beforeFinishFn async callback receives correct rebase data", function () {
        const baseFileName = "baseNewFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const baseFileContent = "How do you feel about Toll Roads?";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let ourBranch;
        let theirBranch;
        let ourBranchShaPreRebase;
        const ourBranchShaPostRebase = "b937100ee0ea17ef20525306763505a7fe2be29e";
        let theirBranchSha;

        let nextCalls = 0;

        let calledBeforeFinishFn = false;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), baseFileName), baseFileContent).then(() => {
            return RepoUtils.addFileToIndex(repository, baseFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "b5cdc109d437c4541a13fb7509116b5f03d5039a");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "be03abdf0353d05924c53bebeb0e5bb129cda44a");

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
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, theirFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "be5f0fd38a39a67135ad68921c93cd5c17fefb3d");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            theirBranchSha = commitOid.toString();
            assert.equal(theirBranchSha, "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");

            return removeFileFromIndex(repository, theirFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), theirFileName));
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, ourFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "77867fc0bfeb3f80ab18a78c8d53aa3a06207047");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            ourBranchShaPreRebase = commitOid.toString();
            assert.equal(ourBranchShaPreRebase, "e7f37ee070837052937e24ad8ba66f6d83ae7941");

            return removeFileFromIndex(repository, ourFileName);
        }).then(() => {
            return fs.rm(path.join(repository.workdir(), ourFileName));
        }).then(() => {
            return repository.checkoutBranch(ourBranchName);
        }).then(() => {
            return repository.rebaseBranches(ourBranchName, theirBranchName, null, ourSignature, (rebase) => {
                assert.ok(rebase instanceof Rebase);

                nextCalls++;

                return Promise.resolve();
            }, (rebaseMetadata) => {
                calledBeforeFinishFn = true;

                assert.equal(rebaseMetadata.ontoName, theirBranchName);
                assert.equal(rebaseMetadata.ontoSha, theirBranchSha);
                assert.equal(rebaseMetadata.originalHeadName, ourBranchName);
                assert.equal(rebaseMetadata.originalHeadSha, ourBranchShaPreRebase);
                assert.deepEqual(rebaseMetadata.rewritten, [[ourBranchShaPreRebase, ourBranchShaPostRebase]]);

                return Promise.resolve();
            });
        }).then((commit) => {
            // verify that the beforeNextFn callback was called
            assert.equal(nextCalls, 2);

            // verify that the beforeFinishFn callback was called
            assert(calledBeforeFinishFn, "beforeFinishFn was not called");

            // verify that the "ours" branch has moved to the correct place
            assert.equal(commit.id().toString(), ourBranchShaPostRebase);

            return commit.parent(0);
        }).then((commit) => {
            // verify that we are on top of "their commit"
            assert.equal(commit.id().toString(), "e9ebd92f2f4778baf6fa8e92f0c68642f931a554");
        });
    });

    it("can rebase with conflicts using the convenience methods", function () {
        const fileName = "everyonesFile.txt";

        const baseFileContent = "How do you feel about Toll Roads?\n";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!\n";
        const theirFileContent = "I'm skeptical about Toll Roads\n";

        const expectedConflictedFileContent =
            "How do you feel about Toll Roads?\n" +
            "<<<<<<< theirs\n" +
            "I'm skeptical about Toll Roads\n" +
            "=======\n" +
            "I like Toll Roads. I have an EZ-Pass!\n" +
            ">>>>>>> we made a commit\n";

        const conflictSolvedFileContent =
            "How do you feel about Toll Roads?\n" +
            "He's skeptical about Toll Roads,\n" +
            "but I like Toll Roads. I have an EZ-Pass!\n";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let ourBranch;
        let theirBranch;
        let nextCalls = 0;

        return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "044704f62399fecbe22da6d7d47b14e52625630e");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "80111c46ac73b857a3493b24c81df08639b5de99");

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

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
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
            return repository.rebaseBranches(ourBranchName, theirBranchName, null, ourSignature).then((commit) => {
                assert.fail(commit, undefined,
                    "The index should have been thrown due to merge conflicts");
            }).catch((index) => {
                assert.ok(index);
                assert.ok(index.hasConflicts());

                assert.ok(repository.isRebasing());
            });
        }).then(() => {
            return fs.readFile(path.join(repository.workdir(), fileName), "utf8").then((fileContent) => {
                assert.equal(fileContent, expectedConflictedFileContent);

                return fs.writeFile(path.join(repository.workdir(), fileName), conflictSolvedFileContent);
            });
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            return repository.refreshIndex().then((index) => {
                assert.ok(!index.hasConflicts());

                return repository.continueRebase(ourSignature, (rebase) => {
                    assert.ok(rebase instanceof Rebase);

                    nextCalls++;

                    return Promise.resolve();
                });
            });
        }).then((commit) => {
            // verify that the beforeNextFn callback was called
            assert.equal(nextCalls, 1);

            // verify that the "ours" branch has moved to the correct place
            assert.equal(commit.id().toString(), "ef6d0e95167435b3d58f51ab165948c72f6f94b6");

            assert.ok(!repository.isRebasing());
            assert.ok(repository.isDefaultState());

            return commit.parent(0);
        }).then((commit) => {
            // verify that we are on top of "their commit"
            assert.equal(commit.id().toString(), "b3c355bb606ec7da87174dfa1a0b0c0e3dc97bc0");
        });
    });
});
