import { garbageCollect } from "./utils/garbage_collect.js";

const {
    std: { path },
    vcs: { git: { Repository, Remote, Enums, Cred } },
    vendor: { lodash: _ }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Remote", () => {
    const reposPath = local("repos/workdir");
    const url = "https://github.com/nodegit/test";
    const url2 = "https://github.com/nodegit/test2";
    const privateUrl = "git@github.com:nodegit/private";

    const removeNonOrigins = (repo) => {
        return repo.getRemotes().then((remotes) => {
            return remotes.reduce((promise, remote) => {
                if (remote !== "origin") {
                    promise = promise.then(() => {
                        return Remote.delete(repo, remote);
                    });
                }

                return promise;
            }, Promise.resolve());
        });
    };

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;

            return Remote.lookup(repository, "origin");
        }).then((remote) => {
            test.remote = remote;

            return removeNonOrigins(test.repository);
        });
    });

    after(function () {
        return removeNonOrigins(this.repository);
    });

    it("can load a remote", function () {
        assert.ok(this.remote instanceof Remote);
    });

    it("can read the remote url", function () {
        assert.equal(this.remote.url().replace(".git", ""), url);
    });

    it("has an empty pushurl by default", function () {
        assert.equal(this.remote.pushurl(), undefined);
    });

    it("can set a remote", function () {
        const repository = this.repository;

        return Remote.create(repository, "origin1", url).then(() => {
            return Remote.setPushurl(repository, "origin1", "https://google.com/");
        }).then(() => {
            return Remote.lookup(repository, "origin1");
        }).then((remote) => {
            assert.equal(remote.pushurl(), "https://google.com/");
        });
    });

    it("can read the remote name", function () {
        assert.equal(this.remote.name(), "origin");
    });

    it("can create and load a new remote", function () {
        const repository = this.repository;

        return Remote.create(repository, "origin2", url).then(() => {
            return Remote.lookup(repository, "origin2");
        }).then((remote) => {
            assert(remote.url(), url);
        });
    });

    it("can delete a remote", function () {
        const repository = this.repository;

        return Remote.create(repository, "origin3", url).then(() => {
            return Remote.delete(repository, "origin3");
        }).then(() => {
            return Remote.lookup(repository, "origin3")
                // We only want to catch the failed lookup
                .then(Promise.reject.bind(Promise), Promise.resolve.bind(Promise));
        });
    });

    it("can download from a remote", function () {
        const repo = this.repository;
        let remoteCallbacks;

        return repo.getRemote("origin").then((remote) => {
            remoteCallbacks = {
                certificateCheck() {
                    return 1;
                }
            };

            return remote.connect(Enums.DIRECTION.FETCH, remoteCallbacks).then(() => {
                return remote.download(null);
            }).then(() => {
                return remote.disconnect();
            });
        });
    });

    it("can monitor transfer progress while downloading", function () {
        // Set a reasonable timeout here now that our repository has grown.
        this.timeout(600000);

        const repo = this.repository;
        let wasCalled = false;

        return Remote.create(repo, "test2", url2).then((remote) => {
            const fetchOpts = {
                callbacks: {
                    credentials(url, userName) {
                        return Cred.sshKeyFromAgent(userName);
                    },
                    certificateCheck() {
                        return 1;
                    },

                    transferProgress() {
                        wasCalled = true;
                    }
                }
            };

            return remote.fetch(null, fetchOpts, null);
        }).then(() => {
            assert.ok(wasCalled);

            return Remote.delete(repo, "test2");
        });
    });

    it("can get the default branch of a remote", function () {
        const remoteCallbacks = {
            certificateCheck() {
                return 1;
            }
        };

        const remote = this.remote;

        return remote.connect(Enums.DIRECTION.FETCH, remoteCallbacks).then(() => {
            return remote.defaultBranch();
        }).then((branchName) => {
            assert.equal("refs/heads/master", branchName);
        });
    });

    it("can fetch from a remote", function () {
        return this.repository.fetch("origin", {
            callbacks: {
                credentials(url, userName) {
                    return Cred.sshKeyFromAgent(userName);
                },
                certificateCheck() {
                    return 1;
                }
            }
        });
    });

    it("can fetch from a private repository", function () {
        const repo = this.repository;
        const fetchOptions = {
            callbacks: {
                credentials(url, userName) {
                    return Cred.sshKeyNew(userName, local("nodegit-test-rsa.pub"), local("nodegit-test-rsa"), "");
                },
                certificateCheck() {
                    return 1;
                }
            }
        };

        return Remote.create(repo, "private", privateUrl).then((remote) => {
            return remote.fetch(null, fetchOptions, "Fetch from private");
        }).catch(() => {
            assert.fail("Unable to fetch from private repository");
        });
    });

    it.skip("can reject fetching from private repository without valid credentials", function () {
        const repo = this.repository;
        let firstPass = true;
        const fetchOptions = {
            callbacks: {
                credentials(url, userName) {
                    if (firstPass) {
                        firstPass = false;
                        return Cred.sshKeyFromAgent(userName);
                    }
                },
                certificateCheck() {
                    return 1;
                }
            }
        };

        return Remote.create(repo, "private", privateUrl).then((remote) => {
            return remote.fetch(null, fetchOptions, "Fetch from private");
        }).then(() => {
            assert.fail("Should not be able to fetch from repository");
        }).catch((error) => {
            assert.equal(error.message.trim(), "ERROR: Repository not found.", "Should not be able to find repository.");
        });
    });

    it("can fetch from all remotes", function () {
        const repository = this.repository;

        return Remote.create(repository, "test1", url).then(() => {
            return Remote.create(repository, "test2", url2);
        }).then(() => {
            return repository.fetchAll({
                callbacks: {
                    credentials(url, userName) {
                        return Cred.sshKeyFromAgent(userName);
                    },
                    certificateCheck() {
                        return 1;
                    }
                }
            });
        });
    });

    it.skip("will reject if credentials promise rejects", function () {
        const repo = this.repository;
        const branch = "should-not-exist";
        return Remote.lookup(repo, "origin").then((remote) => {
            const ref = `refs/heads/${branch}`;
            const refs = [`${ref}:${ref}`];
            const options = {
                callbacks: {
                    credentials(url, userName) {
                        const test = Promise.resolve("test")
                            .then(() => { })
                            .then(() => { })
                            .then(() => { })
                            .then(() => {
                                return Promise.reject(new Error("failure case"));
                            });
                        return test;
                    },
                    certificateCheck() {
                        return 1;
                    }
                }
            };
            return remote.push(refs, options);
        }).then(() => {
            return Promise.reject(
                new Error("should not be able to push to the repository"));
        }, (err) => {
            if (err.message === "failure case") {
                return Promise.resolve();
            }
            throw err;

        }).then(() => {
            return Remote.lookup(repo, "origin");
        }).then((remote) => {
            const ref = `refs/heads/${branch}`;
            const refs = [`${ref}:${ref}`];
            const options = {
                callbacks: {
                    credentials(url, userName) {
                        const test = Promise.resolve()
                            .then(Promise.resolve.bind(Promise))
                            .then(Promise.resolve.bind(Promise))
                            .then(Promise.resolve.bind(Promise))
                            .then(Promise.reject.bind(Promise));
                        return test;
                    },
                    certificateCheck() {
                        return 1;
                    }
                }
            };
            return remote.push(refs, options);
        }).then(() => {
            return Promise.reject(
                new Error("should not be able to push to the repository"));
        }, (err) => {
            if (err.message === "Method push has thrown an error.") {
                return Promise.resolve();
            }
            throw err;
        });
    });

    it.skip("cannot push to a repository with invalid credentials", function () {
        const repo = this.repository;
        const branch = "should-not-exist";
        return Remote.lookup(repo, "origin").then((remote) => {
            const ref = `refs/heads/${branch}`;
            const refs = [`${ref}:${ref}`];
            let firstPass = true;
            const options = {
                callbacks: {
                    credentials(url, userName) {
                        if (firstPass) {
                            firstPass = false;
                            if (url.indexOf("https") === -1) {
                                return Cred.sshKeyFromAgent(userName);
                            }
                            return Cred.userpassPlaintextNew(userName, "");

                        }
                        return Promise.reject();
                    },
                    certificateCheck() {
                        return 1;
                    }
                }
            };
            return remote.push(refs, options);
        })
            // takes care of windows bug, see the .catch for the proper pathway
            // that this flow should take (cred cb doesn't run twice -> throws error)
            .then(() => {
                return Promise.reject(
                    new Error("should not be able to push to the repository"));
            }, (err) => {
                if (err.message.indexOf(401) === -1) {
                    throw err;
                } else {
                    return Promise.resolve();
                }
            })
            // catches linux / osx failure to use anonymous credentials
            // stops callback infinite loop
            .catch((reason) => {
                const messageWithoutNewlines = reason.message.replace(/\n|\r/g, "");
                const validErrors = [
                    "Method push has thrown an error.",
                    "failed to set credentials: The parameter is incorrect."
                ];
                assert.ok(
                    _.includes(validErrors, messageWithoutNewlines),
                    `Unexpected error: ${reason.message}`
                );
            });
    });

    it("is kept alive by refspec", function () {
        const repo = this.repository;

        garbageCollect();
        const startSelfFreeingCount = Remote.getSelfFreeingInstanceCount();
        const startNonSelfFreeingCount = Remote.getNonSelfFreeingConstructedCount();

        let resolve;
        const promise = new Promise(((_resolve) => {
            resolve = _resolve;
        }));

        let remote;

        repo.getRemote("origin").then((_remote) => {
            remote = _remote;
            setTimeout(resolve, 0);
        });

        return promise.then(() => {
            // make sure we have created one self-freeing remote
            assert.equal(startSelfFreeingCount + 1, Remote.getSelfFreeingInstanceCount());
            assert.equal(startNonSelfFreeingCount, Remote.getNonSelfFreeingConstructedCount());
            let refspec = remote.getRefspec(0);
            assert.equal("refs/heads/*", refspec.src());
            remote = null;
            garbageCollect();
            // the refspec should be holding on to the remote
            assert.equal(startSelfFreeingCount + 1,
                Remote.getSelfFreeingInstanceCount());

            assert.equal("refs/heads/*", refspec.src());

            refspec = null;
            garbageCollect();
            // the remote should be freed now
            assert.equal(startSelfFreeingCount,
                Remote.getSelfFreeingInstanceCount());
        });
    });

    it("can retrieve the list of references advertised by a remote", function () {
        const expectedRemoteHeads = {
            HEAD: {
                local: 0,
                oid: "32789a79e71fbc9e04d3eff7425e1771eb595150",
                loid: "0000000000000000000000000000000000000000",
                name: "HEAD",
                symrefTarget: "refs/heads/master"
            },
            "refs/heads/checkout-test": {
                local: 0,
                oid: "1729c73906bb8467f4095c2f4044083016b4dfde",
                loid: "0000000000000000000000000000000000000000",
                name: "refs/heads/checkout-test",
                symrefTarget: null
            },
            "refs/heads/master": {
                local: 0,
                oid: "32789a79e71fbc9e04d3eff7425e1771eb595150",
                loid: "0000000000000000000000000000000000000000",
                name: "refs/heads/master",
                symrefTarget: null
            },
            "refs/heads/rev-walk": {
                local: 0,
                oid: "32789a79e71fbc9e04d3eff7425e1771eb595150",
                loid: "0000000000000000000000000000000000000000",
                name: "refs/heads/rev-walk",
                symrefTarget: null
            },
            "refs/tags/annotated-tag": {
                local: 0,
                oid: "dc800017566123ff3c746b37284a24a66546667e",
                loid: "0000000000000000000000000000000000000000",
                name: "refs/tags/annotated-tag",
                symrefTarget: null
            },
            "refs/tags/annotated-tag^{}": {
                local: 0,
                oid: "32789a79e71fbc9e04d3eff7425e1771eb595150",
                loid: "0000000000000000000000000000000000000000",
                name: "refs/tags/annotated-tag^{}",
                symrefTarget: null
            },
            "refs/tags/light-weight-tag": {
                local: 0,
                oid: "32789a79e71fbc9e04d3eff7425e1771eb595150",
                loid: "0000000000000000000000000000000000000000",
                name: "refs/tags/light-weight-tag",
                symrefTarget: null
            }
        };

        return this.repository.getRemote("origin").then((remote) => {
            return Promise.all([
                remote,
                remote.connect(Enums.DIRECTION.FETCH)
            ]);
        }).then((results) => {
            const remote = results[0];
            return Promise.all([remote, remote.referenceList()]);
        }).then((results) => {
            const remote = results[0];
            const remoteHeads = results[1];
            const remoteHeadsBySha = _.keyBy(_.map(remoteHeads, (remoteHead) => {
                return {
                    local: remoteHead.local(),
                    oid: remoteHead.oid().toString(),
                    loid: remoteHead.loid().toString(),
                    name: remoteHead.name(),
                    symrefTarget: remoteHead.symrefTarget()
                };
            }), "name");

            _.forEach(_.keys(expectedRemoteHeads), (remoteHeadName) => {
                assert.true(_.isEqual(expectedRemoteHeads[remoteHeadName], remoteHeadsBySha[remoteHeadName]), `Expectations for head ${remoteHeadName} were not met.`);
            });

            return remote.disconnect();
        });
    });

    it("will error when retrieving reference list if not connected", function () {
        return this.repository.getRemote("origin").then((remote) => {
            return remote.referenceList();
        }).then(() => {
            assert.fail("Unconnected remote should have no reference list.");
        }).catch((notConnectedError) => {
            assert(notConnectedError.message === "this remote has never connected");
        });
    });
});
