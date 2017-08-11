import RepoUtils from "./utils/repository_setup";

const {
    fs,
    std: { path },
    vcs: { git: { AnnotatedCommit, Reference, Merge, Signature, Checkout, Repository } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Merge", () => {
    const reposPath = local("repos/merge");
    const ourBranchName = "ours";
    const theirBranchName = "theirs";

    beforeEach(function () {
        const test = this;
        return RepoUtils.createRepository(reposPath).then((repo) => {
            test.repository = repo;
        });
    });

    it("can cleanly merge 2 files", function () {
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let theirCommit;
        let ourBranch;
        let theirBranch;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(ourFileName)
                .then(() => {
                    return index.write();
                })
                .then(() => {
                    return index.writeTree();
                });
        }).then((oid) => {
            assert.equal(oid.toString(), "11ead82b1135b8e240fb5d61e703312fb9cc3d6a");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "we made a commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "91a183f87842ebb7a9b08dad8bc2473985796844");

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
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(theirFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "76631cb5a290dafe2959152626bb90f2a6d8ec94");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");

            return repository.getCommit(commitOid).then((commit) => {
                theirCommit = commit;
            });
        }).then(() => {
            return Merge.commits(repository, ourCommit, theirCommit);
        }).then((index) => {
            assert(!index.hasConflicts());
            return index.writeTreeTo(repository);
        }).then((oid) => {
            assert.equal(oid.toString(), "76631cb5a290dafe2959152626bb90f2a6d8ec94");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we merged their commit", oid, [ourCommit, theirCommit]);
        }).then((commitId) => {
            assert.equal(commitId.toString(), "eedee554af34dd4001d8abc799cb55bb7e56a58b");
        });
    });

    it("can fast-forward using the convenience method", function () {
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let theirCommit;
        let ourBranch;
        let theirBranch;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(ourFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "11ead82b1135b8e240fb5d61e703312fb9cc3d6a");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "we made a commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "91a183f87842ebb7a9b08dad8bc2473985796844");

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
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(theirFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "76631cb5a290dafe2959152626bb90f2a6d8ec94");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");

            return repository.getCommit(commitOid).then((commit) => {
                theirCommit = commit;
            });
        }).then(() => {
            const opts = { checkoutStrategy: Checkout.STRATEGY.FORCE };
            return repository.checkoutBranch(ourBranchName, opts);
        }).then(() => {
            return repository.mergeBranches(ourBranchName, theirBranchName, ourSignature);
        }).then((oid) => {
            assert.equal(oid.toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");

            return repository.getBranchCommit(ourBranchName).then((branchCommit) => {
                assert.equal(oid.toString(), branchCommit.toString());
            });
        }).then(() => {
            return repository.getStatus();
        }).then((statuses) => {
            // make sure we didn't change the index
            assert.equal(statuses.length, 0);
        });
    });

    it("can merge --no-ff a fast-forward using the convenience method",
        function () {
            const ourFileName = "ourNewFile.txt";
            const theirFileName = "theirNewFile.txt";

            const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
            const theirFileContent = "I'm skeptical about Toll Roads";

            const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
            const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

            const repository = this.repository;
            let ourCommit;
            let theirCommit;
            let ourBranch;
            let theirBranch;

            // Load up the repository index and make our initial commit to HEAD
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent).then(() => {
                return repository.refreshIndex();
            }).then((index) => {
                return index.addByPath(ourFileName).then(() => {
                    return index.write();
                }).then(() => {
                    return index.writeTree();
                });
            }).then((oid) => {
                assert.equal(oid.toString(),
                    "11ead82b1135b8e240fb5d61e703312fb9cc3d6a");

                return repository.createCommit("HEAD", ourSignature,
                    ourSignature, "we made a commit", oid, []);
            }).then((commitOid) => {
                assert.equal(commitOid.toString(),
                    "91a183f87842ebb7a9b08dad8bc2473985796844");

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
                return repository.refreshIndex();
            }).then((index) => {
                return index.addByPath(theirFileName).then(() => {
                    return index.write();
                }).then(() => {
                    return index.writeTree();
                });
            }).then((oid) => {
                assert.equal(oid.toString(), "76631cb5a290dafe2959152626bb90f2a6d8ec94");

                return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
            }).then((commitOid) => {
                assert.equal(commitOid.toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");

                return repository.getCommit(commitOid).then((commit) => {
                    theirCommit = commit;
                });
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.SAFE |
                    Checkout.STRATEGY.RECREATE_MISSING
                };
                return repository.checkoutBranch(ourBranchName, opts);
            }).then(() => {
                return repository.mergeBranches(ourBranchName, theirBranchName, ourSignature, Merge.PREFERENCE.NO_FASTFORWARD);
            }).then((oid) => {
                assert.equal(oid.toString(), "65516eb7b20f51d275096cd28f132ff606a09e07");

                return repository.getBranchCommit(ourBranchName).then((branchCommit) => {
                    assert.equal(oid.toString(), branchCommit.toString());
                });
            }).then(() => {
                return repository.getStatus();
            }).then((statuses) => {
                // make sure we didn't change the index
                assert.equal(statuses.length, 0);
            });
        });

    it("can merge --no-ff a non-fast-forward using the convenience method",
        function () {
            const initialFileName = "initialFile.txt";
            const ourFileName = "ourNewFile.txt";
            const theirFileName = "theirNewFile.txt";

            const initialFileContent = "I'd like to drive somewhere";
            const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
            const theirFileContent = "I'm skeptical about Toll Roads";

            const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
            const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

            const repository = this.repository;
            let initialCommit;
            let ourCommit;
            let theirCommit;
            let ourBranch;
            let theirBranch;

            // Load up the repository index and make our initial commit to HEAD
            return fs.writeFile(path.join(repository.workdir(), initialFileName), initialFileContent).then(() => {
                return repository.refreshIndex();
            }).then((index) => {
                return index.addByPath(initialFileName).then(() => {
                    return index.write();
                }).then(() => {
                    return index.writeTree();
                });
            }).then((oid) => {
                assert.equal(oid.toString(),
                    "21a553813e2f670815b649eef51eeadb253a5d0c");

                return repository.createCommit("HEAD", ourSignature,
                    ourSignature, "initial commit", oid, []);
            }).then((commitOid) => {
                assert.equal(commitOid.toString(), "af66a9c799a10a23319ee4318c8bb2021521f539");

                return repository.getCommit(commitOid).then((commit) => {
                    initialCommit = commit;
                }).then(() => {
                    return repository.createBranch(ourBranchName, commitOid)
                        .then((branch) => {
                            ourBranch = branch;
                            return repository.createBranch(theirBranchName, commitOid);
                        });
                });
            }).then((branch) => {
                theirBranch = branch;
            }).then(() => {
                return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
            }).then(() => {
                return repository.refreshIndex();
            }).then((index) => {
                return index.addByPath(ourFileName).then(() => {
                    return index.write();
                }).then(() => {
                    return index.writeTree();
                });
            }).then((oid) => {
                assert.equal(oid.toString(), "af60aa06b3537f75b427f6268a130c842c84a137");

                return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [initialCommit]);
            }).then((commitOid) => {
                assert.equal(commitOid.toString(), "7ce31c05427659986d50abfb90c8f7db88ef4fa1");

                return repository.getCommit(commitOid).then((commit) => {
                    ourCommit = commit;
                });
            }).then(() => {
                return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
            }).then(() => {
                return repository.refreshIndex();
            }).then((index) => {
                return index.addByPath(theirFileName).then(() => {
                    return index.write();
                }).then(() => {
                    return index.writeTree();
                });
            }).then((oid) => {
                assert.equal(oid.toString(), "f007361737a2ca00a0e80fc2daf55064463173b4");

                return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [initialCommit]);
            }).then((commitOid) => {
                assert.equal(commitOid.toString(), "b588f0eef1809226f8f7db542940749da15ae1de");

                return repository.getCommit(commitOid).then((commit) => {
                    theirCommit = commit;
                });
            }).then(() => {
                const opts = { checkoutStrategy: Checkout.STRATEGY.FORCE };
                return repository.checkoutBranch(ourBranchName, opts);
            }).then(() => {
                return repository.mergeBranches(ourBranchName, theirBranchName, ourSignature, Merge.PREFERENCE.NO_FASTFORWARD);
            }).then((commitId) => {
                assert.equal(commitId.toString(), "96d6f1d0704eb3ef9121a13348d17c1d672c28aa");
            }).then(() => {
                return repository.getStatus();
            }).then((statuses) => {
                // make sure we didn't change the index
                assert.equal(statuses.length, 0);
            });
        });

    it("can merge --no-ff a non-fast-forward using the convenience method with custom merge message via sync callback", function () {
        const initialFileName = "initialFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const initialFileContent = "I'd like to drive somewhere";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let initialCommit;
        let ourCommit;
        let theirCommit;
        let ourBranch;
        let theirBranch;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), initialFileName), initialFileContent).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(initialFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "21a553813e2f670815b649eef51eeadb253a5d0c");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "af66a9c799a10a23319ee4318c8bb2021521f539");

            return repository.getCommit(commitOid).then((commit) => {
                initialCommit = commit;
            }).then(() => {
                return repository.createBranch(ourBranchName, commitOid).then((branch) => {
                    ourBranch = branch;
                    return repository.createBranch(theirBranchName, commitOid);
                });
            });
        }).then((branch) => {
            theirBranch = branch;
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(ourFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "af60aa06b3537f75b427f6268a130c842c84a137");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "7ce31c05427659986d50abfb90c8f7db88ef4fa1");

            return repository.getCommit(commitOid).then((commit) => {
                ourCommit = commit;
            });
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(theirFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "f007361737a2ca00a0e80fc2daf55064463173b4");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "b588f0eef1809226f8f7db542940749da15ae1de");

            return repository.getCommit(commitOid).then((commit) => {
                theirCommit = commit;
            });
        }).then(() => {
            const opts = { checkoutStrategy: Checkout.STRATEGY.FORCE };
            return repository.checkoutBranch(ourBranchName, opts);
        }).then(() => {
            return repository.mergeBranches(ourBranchName, theirBranchName, ourSignature, Merge.PREFERENCE.NO_FASTFORWARD, null,
                (message) => {
                    assert(message === "Merge branch 'theirs' into ours");
                    return "We manipulated the message, HAH.";
                }
            );
        }).then((commitId) => {
            assert.equal(commitId.toString(), "5b49a43be0ba95e7767dd9a2880bab4795c6db70");
        }).then(() => {
            return repository.getStatus();
        }).then((statuses) => {
            // make sure we didn't change the index
            assert.equal(statuses.length, 0);
        });
    }
    );

    it("can merge --no-ff a non-fast-forward using the convenience method with custom merge message via async callback", function () {
        const initialFileName = "initialFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const initialFileContent = "I'd like to drive somewhere";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let initialCommit;
        let ourCommit;
        let theirCommit;
        let ourBranch;
        let theirBranch;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), initialFileName), initialFileContent).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(initialFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "21a553813e2f670815b649eef51eeadb253a5d0c");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "af66a9c799a10a23319ee4318c8bb2021521f539");

            return repository.getCommit(commitOid).then((commit) => {
                initialCommit = commit;
            }).then(() => {
                return repository.createBranch(ourBranchName, commitOid).then((branch) => {
                    ourBranch = branch;
                    return repository.createBranch(theirBranchName, commitOid);
                });
            });
        }).then((branch) => {
            theirBranch = branch;
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(ourFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "af60aa06b3537f75b427f6268a130c842c84a137");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "7ce31c05427659986d50abfb90c8f7db88ef4fa1");

            return repository.getCommit(commitOid).then((commit) => {
                ourCommit = commit;
            });
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(theirFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "f007361737a2ca00a0e80fc2daf55064463173b4");

            return repository.createCommit(theirBranch.name(), theirSignature,
                theirSignature, "they made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "b588f0eef1809226f8f7db542940749da15ae1de");

            return repository.getCommit(commitOid).then((commit) => {
                theirCommit = commit;
            });
        }).then(() => {
            const opts = { checkoutStrategy: Checkout.STRATEGY.FORCE };
            return repository.checkoutBranch(ourBranchName, opts);
        }).then(() => {
            return repository.mergeBranches(ourBranchName, theirBranchName, ourSignature, Merge.PREFERENCE.NO_FASTFORWARD, null,
                (message) => {
                    assert(message === "Merge branch 'theirs' into ours");
                    return Promise.resolve("We manipulated the message, HAH.");
                }
            );
        }).then((commitId) => {
            assert.equal(commitId.toString(), "5b49a43be0ba95e7767dd9a2880bab4795c6db70");
        }).then(() => {
            return repository.getStatus();
        }).then((statuses) => {
            // make sure we didn't change the index
            assert.equal(statuses.length, 0);
        });
    }
    );

    it("can merge --ff-only a fast-forward using the convenience method", function () {
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let ourCommit;
        let theirCommit;
        let ourBranch;
        let theirBranch;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(ourFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "11ead82b1135b8e240fb5d61e703312fb9cc3d6a");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "we made a commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "91a183f87842ebb7a9b08dad8bc2473985796844");

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
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(theirFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "76631cb5a290dafe2959152626bb90f2a6d8ec94");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");

            return repository.getCommit(commitOid).then((commit) => {
                theirCommit = commit;
            });
        }).then(() => {
            const opts = { checkoutStrategy: Checkout.STRATEGY.FORCE };
            return repository.checkoutBranch(ourBranchName, opts);
        }).then(() => {
            return repository.mergeBranches(ourBranchName, theirBranchName, ourSignature, Merge.PREFERENCE.FASTFORWARD_ONLY);
        }).then((oid) => {
            assert.equal(oid.toString(), "0e9231d489b3f4303635fc4b0397830da095e7e7");

            return repository.getBranchCommit(ourBranchName).then((branchCommit) => {
                assert.equal(oid.toString(), branchCommit.toString());
            });
        }).then(() => {
            return repository.getStatus();
        }).then((statuses) => {
            // make sure we didn't change the index
            assert.equal(statuses.length, 0);
        });
    });

    it("doesn't merge --ff-only a non-fast-forward using the convenience method", function () {
        const initialFileName = "initialFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const initialFileContent = "I'd like to drive somewhere";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let initialCommit;
        let ourCommit;
        let theirCommit;
        let ourBranch;
        let theirBranch;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), initialFileName), initialFileContent).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(initialFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "21a553813e2f670815b649eef51eeadb253a5d0c");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "af66a9c799a10a23319ee4318c8bb2021521f539");

            return repository.getCommit(commitOid).then((commit) => {
                initialCommit = commit;
            }).then(() => {
                return repository.createBranch(ourBranchName, commitOid).then((branch) => {
                    ourBranch = branch;
                    return repository.createBranch(theirBranchName, commitOid);
                });
            });
        }).then((branch) => {
            theirBranch = branch;
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(ourFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "af60aa06b3537f75b427f6268a130c842c84a137");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "7ce31c05427659986d50abfb90c8f7db88ef4fa1");

            return repository.getCommit(commitOid).then((commit) => {
                ourCommit = commit;
            });
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(theirFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "f007361737a2ca00a0e80fc2daf55064463173b4");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "b588f0eef1809226f8f7db542940749da15ae1de");

            return repository.getCommit(commitOid).then((commit) => {
                theirCommit = commit;
            });
        }).then(() => {
            const opts = { checkoutStrategy: Checkout.STRATEGY.FORCE };
            return repository.checkoutBranch(ourBranchName, opts);
        }).then(() => {
            return repository.mergeBranches(ourBranchName, theirBranchName, ourSignature, Merge.PREFERENCE.FASTFORWARD_ONLY);
        }).then((commitId) => {
            assert.equal(commitId.toString(), "7ce31c05427659986d50abfb90c8f7db88ef4fa1");
        }).then(() => {
            return repository.getStatus();
        }).then((statuses) => {
            // make sure we didn't change the index
            assert.equal(statuses.length, 0);
        });
    });

    it("can merge cleanly using the convenience method", function () {
        const initialFileName = "initialFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const initialFileContent = "I'd like to drive somewhere";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let initialCommit;
        let ourCommit;
        let theirCommit;
        let ourBranch;
        let theirBranch;

        // Load up the repository index and make our initial commit to HEAD
        return fs.writeFile(path.join(repository.workdir(), initialFileName), initialFileContent).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(initialFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "21a553813e2f670815b649eef51eeadb253a5d0c");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "af66a9c799a10a23319ee4318c8bb2021521f539");

            return repository.getCommit(commitOid).then((commit) => {
                initialCommit = commit;
            }).then(() => {
                return repository.createBranch(ourBranchName, commitOid).then((branch) => {
                    ourBranch = branch;
                    return repository.createBranch(theirBranchName, commitOid);
                });
            });
        }).then((branch) => {
            theirBranch = branch;
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), ourFileName), ourFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(ourFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "af60aa06b3537f75b427f6268a130c842c84a137");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "7ce31c05427659986d50abfb90c8f7db88ef4fa1");

            return repository.getCommit(commitOid).then((commit) => {
                ourCommit = commit;
            });
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), theirFileName), theirFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(theirFileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "f007361737a2ca00a0e80fc2daf55064463173b4");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "b588f0eef1809226f8f7db542940749da15ae1de");

            return repository.getCommit(commitOid).then((commit) => {
                theirCommit = commit;
            });
        }).then(() => {
            return repository.mergeBranches(ourBranchName, theirBranchName,
                ourSignature);
        }).then((commitId) => {
            assert.equal(commitId.toString(), "96d6f1d0704eb3ef9121a13348d17c1d672c28aa");
        });
    });

    it("can merge 2 branchs with conflicts on a single file", function () {
        const baseFileContent = "All Bobs are created equal. ish.\n";
        const ourFileContent = "Big Bobs are best, IMHO.\n";
        const theirFileContent = "Nobody expects the small Bobquisition!\n";
        const finalFileContent = "Big Bobs are beautiful, and the small are unexpected!\n";

        const baseSignature = Signature.create("Peaceful Bob", "justchill@bob.net", 123456789, 60);
        const ourSignature = Signature.create("Big Bob", "impressive@bob.net", 123456789, 60);
        const theirSignature = Signature.create("Small Bob", "underestimated@bob.net", 123456789, 60);

        const repository = this.repository;
        let baseCommit;
        let baseCommitOid;
        let ourCommit;
        let theirCommit;
        let ourBranch;
        let theirBranch;
        const fileName = "newFile.txt";

        return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "ea2f6521fb8097a881f43796946ac1603e1f4d75");

            return repository.createCommit("HEAD", baseSignature, baseSignature, "bobs are all ok", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "a9b202f7612273fb3a68f718304298704eaeb735");
            baseCommitOid = commitOid;

            return repository.getCommit(commitOid).then((commit) => {
                baseCommit = commit;
            });
        }).then(() => {
            return repository.createBranch(ourBranchName, baseCommitOid).then((branch) => {
                ourBranch = branch;
            });
        }).then(() => {
            return repository.createBranch(theirBranchName, baseCommitOid).then((branch) => {
                theirBranch = branch;
            });
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), fileName), ourFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "c39b1e38b09085856cec7e7ff33e90f5a537d8a5");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "lol big bobs :yesway:", oid, [baseCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "935a89c09ad757a9dde2c0257f6f1e379f71816f");

            return repository.getCommit(commitOid).then((commit) => {
                ourCommit = commit;
            });
        }).then(() => {
            return fs.writeFile(path.join(repository.workdir(), fileName), theirFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "d1a894a9a4a8c820eb66c82cdd7e6b76c8f713cb");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "lol big bobs :poop:", oid, [baseCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "bebb9ec2e0684c7cb7c1e1601c7d5a8f52b8b123");

            return repository.getCommit(commitOid).then((commit) => {
                theirCommit = commit;
            });
        }).then(() => {
            return Reference.lookup(repository, "HEAD").then((head) => {
                return head.symbolicSetTarget(ourBranch.name(), "");
            });
        }).then(() => {
            return Merge.commits(repository, ourCommit, theirCommit, null);
        }).then((index) => {
            assert(index.hasConflicts());
            fs.writeFileSync(path.join(repository.workdir(), fileName), finalFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "b1cd49a27cd33b99ab6dad2fb82b3174812a8b47");

            return repository.createCommit(ourBranch.name(), baseSignature, baseSignature, "Stop this bob sized fued", oid, [ourCommit, theirCommit]);
        }).then((commitId) => {
            assert.equal(commitId.toString(), "49014ccabf5125f9b69316acde36f891dfdb8b5c");
        });
    });

    it("leaves repo in MERGE state after a standard merge with conflicts fails", function () {
        const fileName = "everyonesFile.txt";

        const baseFileContent = "How do you feel about Toll Roads?\n";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!\n";
        const theirFileContent = "I'm skeptical about Toll Roads\n";

        const expectedConflictedFileContent =
            "How do you feel about Toll Roads?\n" +
            "<<<<<<< HEAD\n" +
            "I like Toll Roads. I have an EZ-Pass!\n" +
            "=======\n" +
            "I'm skeptical about Toll Roads\n" +
            ">>>>>>> theirs\n";

        const conflictSolvedFileContent =
            "How do you feel about Toll Roads?\n" +
            "He's skeptical about Toll Roads,\n" +
            "but I like Toll Roads. I have an EZ-Pass!\n";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        const repository = this.repository;
        let initialCommit;
        let ourBranch;
        let theirBranch;

        let repoGitPath = repository.path();
        if (!~repoGitPath.indexOf("/.git")) {
            repoGitPath = path.join(repoGitPath, ".git");
        }

        return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "044704f62399fecbe22da6d7d47b14e52625630e");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "80111c46ac73b857a3493b24c81df08639b5de99");

            return repository.getCommit(commitOid).then((commit) => {
                initialCommit = commit;
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
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "b826e989aca7647bea64810f0a2a38acbbdd4c1a");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "b3c355bb606ec7da87174dfa1a0b0c0e3dc97bc0");

            return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent + ourFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            assert.equal(oid.toString(), "e7fe41bf7c0c28766887a63ffe2f03f624276fbe");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "28cfeb17f66132edb3c4dacb7ff38e8dd48a1844");

            //return repository.getCommit(commitOid)

            const opts = {
                checkoutStrategy: Checkout.STRATEGY.FORCE
            };

            return repository.checkoutBranch(ourBranchName, opts);
        }).then(() => {
            return repository.getHeadCommit();
        }).then((commit) => {
            assert.equal(commit.id().toString(), "28cfeb17f66132edb3c4dacb7ff38e8dd48a1844");

            return repository.getReference(theirBranchName);
        }).then((theirRef) => {
            return AnnotatedCommit.fromRef(repository, theirRef);
        }).then((theirAnnotatedCommit) => {
            return Merge(repository, theirAnnotatedCommit);
        }).then((result) => {
            assert.equal(result, 0);

            assert.equal(repository.state(), Repository.STATE.MERGE);
            // verify the convenience method
            assert.ok(repository.isMerging());

            assert.ok(fs.existsSync(path.join(repoGitPath, "MERGE_HEAD")));
            assert.ok(fs.existsSync(path.join(repoGitPath, "MERGE_MSG")));
            assert.ok(fs.existsSync(path.join(repoGitPath, "MERGE_MODE")));

            return fs.readFile(path.join(repoGitPath, "MERGE_HEAD"), { encoding: "utf8" });
        }).then((mergeHeadContents) => {
            assert.equal(mergeHeadContents, "b3c355bb606ec7da87174dfa1a0b0c0e3dc97bc0\n");

            return fs.readFile(path.join(repository.workdir(), fileName), { encoding: "utf8" });
        }).then((fileContent) => {
            assert.equal(fileContent, expectedConflictedFileContent);

            return fs.writeFile(path.join(repository.workdir(), fileName), conflictSolvedFileContent);
        }).then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            return index.addByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        }).then((oid) => {
            return Promise.all([
                repository.getBranchCommit(ourBranchName),
                repository.getBranchCommit("MERGE_HEAD")
            ]).then((commits) => {
                const msg = fs.readFileSync(path.join(repoGitPath, "MERGE_MSG"), { encoding: "utf8" });
                assert.ok(msg);

                return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, msg, oid, [commits[0], commits[1]]);
            });
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "03ba156a7a1660f179b6b2dbc6a542fcf88d022d");

            // merge isn't cleaned up automatically
            assert.ok(fs.existsSync(path.join(repoGitPath, "MERGE_HEAD")));
            assert.ok(fs.existsSync(path.join(repoGitPath, "MERGE_MSG")));
            assert.ok(fs.existsSync(path.join(repoGitPath, "MERGE_MODE")));

            assert.equal(repository.stateCleanup(), 0);

            assert.ok(!fs.existsSync(path.join(repoGitPath, "MERGE_HEAD")));
            assert.ok(!fs.existsSync(path.join(repoGitPath, "MERGE_MSG")));
            assert.ok(!fs.existsSync(path.join(repoGitPath, "MERGE_MODE")));

            assert.equal(repository.state(), Repository.STATE.NONE);
            // verify the convenience method
            assert.ok(repository.isDefaultState());
        });
    });

    it("can retrieve error code on if common merge base not found", () => {
        let repo;
        return Repository.open(local("repos/workdir")).then((r) => {
            repo = r;
            return repo.getCommit("4bd806114ce26503c103c85dcc985021951bbc18");
        }).then((commit) => {
            return commit.getParents(commit.parentcount());
        }).then((parents) => {
            return Merge.base(repo, parents[0], parents[1]).then(() => {
                return Promise.reject(new Error("should not be able to retrieve common merge base"));
            }, (err) => {
                assert.equal("no merge base found", err.message);
                assert.equal(adone.vcs.git.Error.CODE.ENOTFOUND, err.errno);
            });
        });
    });
});
