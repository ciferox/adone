
const {
    std: { path },
    vendor: { lodash: _ },
    vcs: { git: { Repository, Clone, Cred } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Clone", function () {
    const clonePath = local("repos/clone");

    const sshPublicKeyPath = local("id_rsa.pub");
    const sshPrivateKeyPath = local("id_rsa");
    const sshEncryptedPublicKeyPath = local("encrypted_rsa.pub");
    const sshEncryptedPrivateKeyPath = local("encrypted_rsa");

    // Set a reasonable timeout here now that our repository has grown.
    this.timeout(60000);

    beforeEach(() => {
        return adone.fs.rm(clonePath).catch((err) => {
            console.log(err);

            throw err;
        });
    });

    it.skip("can clone with http", function () {
        const test = this;
        const url = "http://git.tbranyen.com/smart/site-content";

        return Clone(url, clonePath).then((repo) => {
            assert.ok(repo instanceof Repository);
            test.repository = repo;
        });
    });

    it("can clone with https", function () {
        const test = this;
        const url = "https://github.com/nodegit/test.git";
        const opts = {
            fetchOpts: {
                callbacks: {
                    certificateCheck() {
                        return 1;
                    }
                }
            }
        };

        return Clone(url, clonePath, opts).then((repo) => {
            assert.ok(repo instanceof Repository);
            test.repository = repo;
        });
    });

    it("can clone twice with https using same config object", function () {
        const test = this;
        const url = "https://github.com/nodegit/test.git";
        let progressCount = 0;
        const opts = {
            fetchOpts: {
                callbacks: {
                    transferProgress(progress) {
                        progressCount++;
                    }
                }
            }
        };

        return Clone(url, clonePath, opts).then((repo) => {
            assert.ok(repo instanceof Repository);
            assert.notEqual(progressCount, 0);
            return adone.fs.rm(clonePath);
        }).then(() => {
            progressCount = 0;
            return Clone(url, clonePath, opts);
        }).then((repo) => {
            assert.ok(repo instanceof Repository);
            assert.notEqual(progressCount, 0);
            test.repository = repo;
        });
    });

    function updateProgressIntervals(progressIntervals, lastInvocation) {
        const now = new Date();
        if (lastInvocation) {
            progressIntervals.push(now - lastInvocation);
        }
        return now;
    }

    it("can clone with https and default throttled progress", function () {
        const test = this;
        const url = "https://github.com/nodegit/test.git";
        let progressCount = 0;
        let lastInvocation;
        const progressIntervals = [];
        const opts = {
            fetchOpts: {
                callbacks: {
                    transferProgress(progress) {
                        lastInvocation = updateProgressIntervals(progressIntervals, lastInvocation);
                        progressCount++;
                    }
                }
            }
        };

        return Clone(url, clonePath, opts).then((repo) => {
            assert.ok(repo instanceof Repository);
            assert.notEqual(progressCount, 0);
            const averageProgressInterval = _.sum(progressIntervals) / progressIntervals.length;
            // even though we are specifying a throttle period of 100,
            // the throttle is applied on the scheduling side,
            // and actual execution is at the mercy of the main js thread
            // so the actual throttle intervals could be less than the specified
            // throttle period
            if (!averageProgressInterval || averageProgressInterval < 75) {
                assert.fail(averageProgressInterval, 75, "unexpected average time between callbacks", "<");
            }
            test.repository = repo;
        });
    });

    it("can clone with https and explicitly throttled progress", function () {
        const test = this;
        const url = "https://github.com/nodegit/test.git";
        let progressCount = 0;
        let lastInvocation;
        const progressIntervals = [];
        const opts = {
            fetchOpts: {
                callbacks: {
                    transferProgress: {
                        throttle: 50,
                        callback(progress) {
                            lastInvocation = updateProgressIntervals(progressIntervals, lastInvocation);
                            progressCount++;
                        }
                    }
                }
            }
        };

        return Clone(url, clonePath, opts).then((repo) => {
            assert.ok(repo instanceof Repository);
            assert.notEqual(progressCount, 0);
            const averageProgressInterval = _.sum(progressIntervals) / progressIntervals.length;
            if (!averageProgressInterval || averageProgressInterval < 35) {
                assert.fail(averageProgressInterval, 35, "unexpected average time between callbacks", "<");
            }
            test.repository = repo;
        });
    });

    it("can clone without waiting for callback results", function () {
        const test = this;
        const url = "https://github.com/nodegit/test.git";
        let lastReceivedObjects = 0;
        let cloneFinished = false;
        const opts = {
            fetchOpts: {
                callbacks: {
                    transferProgress: {
                        waitForResult: false,
                        callback(progress) {
                            const receivedObjects = progress.receivedObjects();
                            assert.false(cloneFinished, "callback running after clone completion");
                            assert.gt(receivedObjects, lastReceivedObjects);
                            lastReceivedObjects = receivedObjects;
                        }
                    }
                }
            }
        };

        return Clone(url, clonePath, opts).then((repo) => {
            assert.ok(repo instanceof Repository);
            cloneFinished = true;
            test.repository = repo;
        });
    });

    it("can clone using nested function", function () {
        const test = this;
        const url = "https://github.com/nodegit/test.git";
        const opts = {
            fetchOpts: {
                callbacks: {
                    certificateCheck() {
                        return 1;
                    }
                }
            }
        };

        return Clone.clone(url, clonePath, opts).then((repo) => {
            assert.ok(repo instanceof Repository);
            test.repository = repo;
        });
    });

    it.skip("can clone with ssh", function () {
        const test = this;
        const url = "git@github.com:nodegit/test.git";
        const opts = {
            fetchOpts: {
                callbacks: {
                    certificateCheck() {
                        return 1;
                    },
                    credentials(url, userName) {
                        return Cred.sshKeyFromAgent(userName);
                    }
                }
            }
        };

        return Clone(url, clonePath, opts).then((repo) => {
            assert.ok(repo instanceof Repository);
            test.repository = repo;
        });
    });

    it("can clone with ssh while manually loading a key", function () {
        const test = this;
        const url = "git@github.com:nodegit/test.git";
        const opts = {
            fetchOpts: {
                callbacks: {
                    certificateCheck() {
                        return 1;
                    },
                    credentials(url, userName) {
                        return Cred.sshKeyNew(userName, sshPublicKeyPath, sshPrivateKeyPath, "");
                    }
                }
            }
        };

        return Clone(url, clonePath, opts).then((repo) => {
            assert.ok(repo instanceof Repository);
            test.repository = repo;
        });
    });

    it("can clone with ssh while manually loading an encrypted key", function () {
        const test = this;
        const url = "git@github.com:nodegit/test.git";
        const opts = {
            fetchOpts: {
                callbacks: {
                    certificateCheck() {
                        return 1;
                    },
                    credentials(url, userName) {
                        return Cred.sshKeyNew(userName, sshEncryptedPublicKeyPath, sshEncryptedPrivateKeyPath, "test-password");
                    }
                }
            }
        };

        return Clone(url, clonePath, opts).then((repo) => {
            assert.ok(repo instanceof Repository);
            test.repository = repo;
        });
    });

    it("can clone with git", function () {
        const test = this;
        const url = "git://github.com/nodegit/test.git";
        const opts = {
            fetchOpts: {
                callbacks: {
                    certificateCheck() {
                        return 1;
                    }
                }
            }
        };

        return Clone(url, clonePath, opts).then((repo) => {
            test.repository = repo;
            assert.ok(repo instanceof Repository);
        });
    });

    it("can clone with filesystem", function () {
        const test = this;
        const prefix = process.platform === "win32" ? "" : "file://";
        const url = prefix + local("repos/empty");

        return Clone(url, clonePath).then((repo) => {
            assert.ok(repo instanceof Repository);
            test.repository = repo;
        });
    });

    it("will not segfault when accessing a url without username", () => {
        const url = "https://github.com/nodegit/private";

        let firstPass = true;

        return Clone(url, clonePath, {
            fetchOpts: {
                callbacks: {
                    certificateCheck() {
                        return 1;
                    },
                    credentials() {
                        if (firstPass) {
                            firstPass = false;
                            return Cred.userpassPlaintextNew("fake-token",
                                "x-oauth-basic");
                        }
                        return Cred.defaultNew();

                    }
                }
            }
        }).catch((reason) => { });
    });
});
