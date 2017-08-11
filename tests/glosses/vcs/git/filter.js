const {
    fs,
    std: { path },
    vcs: { git: { Reference, FilterRegistry, Error, Signature, Checkout, Repository } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Filter", () => {
    const emptyRepoPath = local("repos/empty");
    const filterName = "psuedo_filter";
    const reposPath = local("repos/workdir");

    const packageJsonPath = path.join(reposPath, "package.json");
    const readmePath = path.join(reposPath, "README.md");

    const mockFilter = {
        apply() { },
        check() { }
    };

    const commitFile = (repo, fileName, fileContent, commitMessage) => {
        let index;
        let treeOid;
        let parent;

        return fs.writeFile(path.join(repo.workdir(), fileName), fileContent).then(() => {
            return repo.refreshIndex();
        }).then((indexResult) => {
            index = indexResult;
        }).then(() => {
            return index.addByPath(fileName);
        }).then(() => {
            return index.write();
        }).then(() => {
            return index.writeTree();
        }).then((oidResult) => {
            treeOid = oidResult;
            return Reference.nameToId(repo, "HEAD");
        }).then((head) => {
            return repo.getCommit(head);
        }).then((parentResult) => {
            parent = parentResult;
            return Promise.all([
                Signature.create("Foo Bar", "foo@bar.com", 123456789, 60),
                Signature.create("Foo A Bar", "foo@bar.com", 987654321, 90)
            ]);
        }).then((signatures) => {
            const author = signatures[0];
            const committer = signatures[1];

            return repo.createCommit("HEAD", author, committer, commitMessage, treeOid, [parent]);
        });
    };

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
            return Repository.open(emptyRepoPath);
        }).then((emptyRepo) => {
            test.emptyRepo = emptyRepo;
            return fs.writeFile(path.join(reposPath, ".gitattributes"), `*.md filter=${filterName} -text`, { encoding: "utf-8" });
        });
    });

    afterEach(() => {
        return FilterRegistry.unregister(filterName).catch((error) => {
            if (error === adone.vcs.git.Error.CODE.ERROR) {
                throw new Error("Cannot unregister filter");
            }
        });
    });

    describe("Register", () => {
        const secondFilter = "hellofilter";

        after((done) => {
            return FilterRegistry.unregister(secondFilter).then(() => {
                done();
            });
        });

        it("can register a filter", () => {
            return FilterRegistry.register(filterName, mockFilter, 0)
                .then((result) => {
                    assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                });
        });

        it("can register multiple filters", () => {
            return FilterRegistry.register(filterName, mockFilter, 0)
                .then((result) => {
                    assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                    return FilterRegistry.register(secondFilter, mockFilter, 1);
                })
                .then((result) => {
                    assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                });
        });

        it("cannot register the same filter twice", () => {
            return FilterRegistry.register(filterName, mockFilter, 0)
                .then((result) => {
                    assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                    return FilterRegistry.register(filterName, mockFilter, 0);
                })
                .catch((error) => {
                    assert.strictEqual(error.errno, adone.vcs.git.Error.CODE.EEXISTS);
                });
        });
    });

    describe("Unregister", () => {
        beforeEach(() => {
            return FilterRegistry.register(filterName, mockFilter, 0);
        });

        it("can unregister the filter", () => {
            return FilterRegistry.unregister(filterName)
                .then((result) => {
                    assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                });
        });

        it("cannot unregister the filter twice", () => {
            return FilterRegistry.unregister(filterName).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                return FilterRegistry.unregister(filterName);
            }).then((result) => {
                assert.fail("Should not have unregistered successfully");
            }).catch((error) => {
                assert.strictEqual(error.errno, adone.vcs.git.Error.CODE.ENOTFOUND);
            });
        });
    });

    describe("Initialize", () => {
        it("initializes successfully", function () {
            const test = this;
            let initialized = false;
            return FilterRegistry.register(filterName, {
                initialize() {
                    initialized = true;
                    return adone.vcs.git.Error.CODE.OK;
                },
                apply() { },
                check() {
                    return adone.vcs.git.Error.CODE.PASSTHROUGH;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
            }).then(() => {
                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout");
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                assert.strictEqual(initialized, true);
            });
        });

        it("initializes successfully even on garbage collect", function () {
            const test = this;
            let initialized = false;
            return FilterRegistry.register(filterName, {
                initialize() {
                    initialized = true;
                    return adone.vcs.git.Error.CODE.OK;
                },
                apply() { },
                check() {
                    return adone.vcs.git.Error.CODE.PASSTHROUGH;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                global.gc && global.gc();

                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout");
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                assert.strictEqual(initialized, true);
            });
        });

        it("does not initialize successfully", function () {
            const test = this;
            let initialized = false;
            return FilterRegistry.register(filterName, {
                initialize() {
                    initialized = true;
                    return adone.vcs.git.Error.CODE.ERROR;
                },
                apply() { },
                check() {
                    return adone.vcs.git.Error.CODE.PASSTHROUGH;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
            }).then(() => {
                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout");
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then((head) => {
                assert.fail(head, undefined, "Should not have actually checked out");
            }).catch((error) => {
                assert.strictEqual(initialized, true);
            });
        });
    });

    describe("Shutdown", () => {
        it("filter successfully shuts down", function () {
            const test = this;
            let shutdown = false;
            return FilterRegistry.register(filterName, {
                apply() { },
                check() {
                    return adone.vcs.git.Error.CODE.PASSTHROUGH;
                },
                shutdown() {
                    shutdown = true;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout", { encoding: "utf-8" });
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                return FilterRegistry.unregister(filterName);
            }).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                assert.strictEqual(shutdown, true);
            });
        });

        it("filter successfully shuts down on garbage collect", function () {
            const test = this;
            let shutdown = false;
            return FilterRegistry.register(filterName, {
                apply() { },
                check() {
                    return adone.vcs.git.Error.CODE.PASSTHROUGH;
                },
                shutdown() {
                    shutdown = true;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout", { encoding: "utf-8" });
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                global.gc && global.gc();
                return FilterRegistry.unregister(filterName);
            }).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                assert.strictEqual(shutdown, true);
            });
        });

        it("shutdown completes even if there is an error", function () {
            const test = this;
            let shutdown = false;
            return FilterRegistry.register(filterName, {
                apply() { },
                check() {
                    return adone.vcs.git.Error.CODE.PASSTHROUGH;
                },
                shutdown() {
                    shutdown = true;
                    throw new Error("I failed");
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout", { encoding: "utf-8" });
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                return FilterRegistry.unregister(filterName);
            }).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                assert.strictEqual(shutdown, true);
            }).catch((error) => {
                assert.fail(error, null, "The operation should not have failed");
            });
        });
    });

    describe("Apply", () => {
        const message = "some new fancy filter";
        const length = message.length;
        const tempBuffer = Buffer.from(message, "utf8");

        it("should not apply when check returns GIT_PASSTHROUGH", function () {
            const test = this;
            let applied = false;

            return FilterRegistry.register(filterName, {
                apply() {
                    applied = true;
                },
                check() {
                    return adone.vcs.git.Error.CODE.PASSTHROUGH;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout", { encoding: "utf-8" });
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                assert.notStrictEqual(applied, true);
            });
        });

        it("should apply filter when check succeeds", function () {
            const test = this;
            let applied = true;

            return FilterRegistry.register(filterName, {
                apply() {
                    applied = true;
                },
                check() {
                    return adone.vcs.git.Error.CODE.OK;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout", { encoding: "utf-8" }
                );
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            })
                .then(() => {
                    assert.strictEqual(applied, true);
                });
        });

        it("does not apply when GIT_PASSTHROUGH is returned", function () {
            const test = this;

            return FilterRegistry.register(filterName, {
                apply(to, from, source) {
                    return to.set(tempBuffer, length)
                        .then(() => {
                            return adone.vcs.git.Error.CODE.PASSTHROUGH;
                        });
                },
                check() {
                    return adone.vcs.git.Error.CODE.OK;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
            }).then(() => {
                const readmeContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });
                assert.notStrictEqual(readmeContent, message);

                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout");
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                const postInitializeReadmeContents = fs.readFileSync(readmePath, { encoding: "utf8" });

                assert.notStrictEqual(postInitializeReadmeContents, message);
            });
        });

        it.skip("applies the filter data on checkout", function () {
            const test = this;

            return FilterRegistry.register(filterName, {
                apply(to, from, source) {
                    return to.set(tempBuffer, length).then((buf) => {
                        return adone.vcs.git.Error.CODE.OK;
                    });
                },
                check(src, attr) {
                    return adone.vcs.git.Error.CODE.OK;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, 0);
            }).then(() => {
                const readmeContent = fs.readFileSync(readmePath, { encoding: "utf8" });
                assert.notStrictEqual(readmeContent, message);
                fs.writeFileSync(readmePath, "whoa");

                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: ["README.md"]
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                const postInitializeReadmeContents = fs.readFileSync(readmePath, { encoding: "utf8" });

                assert.strictEqual(postInitializeReadmeContents, message);
            });
        });

        it.skip("applies the filter data on checkout with gc", function () {
            const test = this;

            return FilterRegistry.register(filterName, {
                apply(to, from, source) {
                    return to.set(tempBuffer, length).then((buf) => {
                        return adone.vcs.git.Error.CODE.OK;
                    });
                },
                check(src, attr) {
                    return adone.vcs.git.Error.CODE.OK;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
            }).then(() => {
                const readmeContent = fs.readFileSync(readmePath, { encoding: "utf8" });
                assert.notStrictEqual(readmeContent, message);
                fs.writeFileSync(readmePath, "whoa");
                global.gc && global.gc();

                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: ["README.md"]
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                const postInitializeReadmeContents = fs.readFileSync(readmePath, { encoding: "utf8" });

                assert.strictEqual(postInitializeReadmeContents, message);
            });
        });

        it.skip("applies the filter data on commit", function () {
            const test = this;

            return FilterRegistry.register(filterName, {
                apply(to, from, source) {
                    return to.set(tempBuffer, length).then((buf) => {
                        return adone.vcs.git.Error.CODE.OK;
                    });
                },
                check(src, attr) {
                    return src.path() === "README.md" ? 0 : adone.vcs.git.Error.CODE.PASSTHROUGH;
                },
                cleanup() { }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
            }).then(() => {
                const readmeContent = fs.readFileSync(readmePath, { encoding: "utf8" });
                assert.notStrictEqual(readmeContent, "testing commit contents");
            }).then(() => {
                return commitFile(test.repository, "README.md",
                    "testing commit contents",
                    "test commit"
                );
            }).then((oid) => {
                return test.repository.getHeadCommit();
            }).then((commit) => {
                const postInitializeReadmeContents = fs.readFileSync(readmePath, { encoding: "utf8" });

                assert.strictEqual(
                    postInitializeReadmeContents, "testing commit contents"
                );
                assert.strictEqual(commit.message(), "test commit");

                return commit.getEntry("README.md");
            }).then((entry) => {
                assert.strictEqual(entry.isBlob(), true);
                return entry.getBlob();
            }).then((blob) => {
                assert.strictEqual(blob.toString(), message);
            });
        });

        it.skip("applies the filter data on commit with gc", function () {
            const test = this;

            return FilterRegistry.register(filterName, {
                apply(to, from, source) {
                    return to.set(tempBuffer, length).then((buf) => {
                        return adone.vcs.git.Error.CODE.OK;
                    });
                },
                check(src, attr) {
                    return src.path() === "README.md" ? 0 : adone.vcs.git.Error.CODE.PASSTHROUGH;
                },
                cleanup() { }
            }, 0).then((result) => {
                global.gc && global.gc();
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
            }).then(() => {
                const readmeContent = fs.readFileSync(readmePath, { encoding: "utf8" });
                assert.notStrictEqual(readmeContent, "testing commit contents");
            }).then(() => {
                return commitFile(test.repository, "README.md",
                    "testing commit contents",
                    "test commit"
                );
            }).then((oid) => {
                global.gc && global.gc();
                return test.repository.getHeadCommit();
            }).then((commit) => {
                const postInitializeReadmeContents = fs.readFileSync(readmePath, { encoding: "utf8" });

                assert.strictEqual(
                    postInitializeReadmeContents, "testing commit contents"
                );
                assert.strictEqual(commit.message(), "test commit");
                global.gc && global.gc();

                return commit.getEntry("README.md");
            }).then((entry) => {
                assert.strictEqual(entry.isBlob(), true);
                return entry.getBlob();
            }).then((blob) => {
                assert.strictEqual(blob.toString(), message);
            });
        });
    });

    describe("Cleanup", () => {
        it("is called successfully", function () {
            const test = this;
            let cleaned = false;
            return FilterRegistry.register(filterName, {
                initialize() {
                    return adone.vcs.git.Error.CODE.OK;
                },
                apply() {
                    return adone.vcs.git.Error.CODE.OK;
                },
                check() {
                    return adone.vcs.git.Error.CODE.OK;
                },
                cleanup() {
                    cleaned = true;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
            }).then(() => {
                const packageContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });
                assert.notEqual(packageContent, "");

                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout", { encoding: "utf8" });
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                assert.strictEqual(cleaned, true);
            });
        });

        it("is called successfully with gc", function () {
            const test = this;
            let cleaned = false;
            return FilterRegistry.register(filterName, {
                initialize() {
                    return adone.vcs.git.Error.CODE.OK;
                },
                apply() {
                    return adone.vcs.git.Error.CODE.OK;
                },
                check() {
                    return adone.vcs.git.Error.CODE.OK;
                },
                cleanup() {
                    cleaned = true;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
            }).then(() => {
                const packageContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });
                assert.notEqual(packageContent, "");

                global.gc && global.gc();
                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout", { encoding: "utf-8" });
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "package.json"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                assert.strictEqual(cleaned, true);
            });
        });

        it("is not called when check returns GIT_PASSTHROUGH", function () {
            const test = this;
            let cleaned = false;

            return FilterRegistry.register(filterName, {
                initialize() {
                    return adone.vcs.git.Error.CODE.OK;
                },
                apply() {
                    return adone.vcs.git.Error.CODE.OK;
                },
                check() {
                    return adone.vcs.git.Error.CODE.PASSTHROUGH;
                },
                cleanup() {
                    cleaned = true;
                }
            }, 0).then((result) => {
                assert.strictEqual(result, adone.vcs.git.Error.CODE.OK);
            }).then(() => {
                const packageContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });
                const readmeContent = fs.readFileSync(readmePath, { encoding: "utf8" });

                assert.notEqual(packageContent, "");
                assert.notEqual(readmeContent, "Initialized");
            }).then(() => {
                return fs.writeFile(packageJsonPath, "Changing content to trigger checkout", { encoding: "utf8" }
                );
            }).then(() => {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE,
                    paths: "README.md"
                };
                return Checkout.head(test.repository, opts);
            }).then(() => {
                assert.notStrictEqual(cleaned, true);
            });
        });
    });
});
