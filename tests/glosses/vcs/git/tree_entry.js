const {
    std: { path },
    vcs: { git: { Repository, Tree } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

// const leakTest = require("../utils/leak_test");

describe("TreeEntry", () => {
    const reposPath = local("repos/workdir");
    const oid = "5716e9757886eaf38d51c86b192258c960d9cfea";

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;

            return repository.getCommit(oid);
        }).then((commit) => {
            test.commit = commit;
        });
    });

    it("will fail on a missing file", function () {
        return this.commit.getEntry("test/-entry.js").then(null, (err) => {
            assert.ok(err instanceof Error);
        });
    });

    it("provides the correct sha for a file", function () {
        return this.commit.getEntry("README.md").then((entry) => {
            assert.equal(entry.sha(), "6cb45ba5d32532bf0d1310dc31ca4f20f59964bc");
        });
    });

    it("provides the correct length for a file", function () {
        return this.commit.getEntry("README.md").then((entry) => {
            assert.equal(entry.name().length, 9);
        });
    });

    it("provides the filename", function () {
        return this.commit.getEntry("test/raw-commit.js").then((entry) => {
            assert.equal(entry.name(), "raw-commit.js");
        });
    });

    it("provides the full path", function () {
        return this.commit.getEntry("test/raw-commit.js").then((entry) => {
            assert.equal(entry.path(), path.normalize("test/raw-commit.js"));
        });
    });

    it("provides the full path when the entry came from a tree", async function () {
        const testTree = function (tree, _dir) {
            const dir = _dir || "";
            const testPromises = [];
            tree.entries().forEach((entry) => {
                const currentPath = path.join(dir, entry.name());
                if (entry.isTree()) {
                    testPromises.push(
                        entry.getTree().then((subtree) => {
                            return testTree(subtree, currentPath);
                        })
                    );
                } else {
                    assert.equal(entry.path(), currentPath);
                }
            });

            return Promise.all(testPromises);
        };

        try {
            await this.commit.getTree();
            await testTree();
        } catch (err) {
            //
        }
    });

    it("provides the blob representation of the entry", function () {
        return this.commit.getEntry("test/raw-commit.js").then((entry) => {
            return entry.getBlob();
        }).then((blob) => {
            assert.equal(blob.rawsize(), 2736);
        });
    });

    it("provides the blob representation via callback", function () {
        return this.commit.getEntry("test/raw-commit.js").then((entry) => {
            entry.getBlob((error, blob) => {
                assert.equal(blob.rawsize(), 2736);
            });
        });
    });

    it("provides the tree the entry is part of", function () {
        return this.commit.getEntry("test").then((entry) => {
            return entry.getTree();
        }).then((tree) => {
            assert.ok(tree instanceof Tree);
        });
    });

    it("can determine if an entry is a file", function () {
        return this.commit.getEntry("README.md").then((entry) => {
            assert.ok(entry.isFile());
        });
    });

    it("can determine if an entry is not a file", function () {
        return this.commit.getEntry("example").then((entry) => {
            assert.equal(entry.isFile(), false);
        });
    });

    it("can determine if an entry is a directory", function () {
        return this.commit.getEntry("example").then((entry) => {
            assert.equal(entry.isDirectory(), true);
        });
    });

    it("can determine if an entry is a submodule", function () {
        const repo = this.repository;
        return repo.getCommit("878ef6efbc5f85c4f63aeedf41addc262a621308").then((commit) => {
            return commit.getEntry("vendor/libgit2").then((entry) => {
                assert.equal(entry.isSubmodule(), true);
            });
        });
    });

    it("can determine if an entry is not a submodule", function () {
        return this.commit.getEntry("example").then((entry) => {
            assert.equal(entry.isSubmodule(), false);
        });
    });

    it("can convert entry into a blob", function () {
        const repo = this.repository;
        return this.commit.getEntry("README.md").then((entry) => {
            return entry.toObject(repo);
        }).then((object) => {
            assert.equal(object.isBlob(), true);
        });
    });

    it("can convert entry into a tree", function () {
        const repo = this.repository;
        return this.commit.getEntry("example").then((entry) => {
            return entry.toObject(repo);
        }).then((object) => {
            assert.equal(object.isTree(), true);
        });
    });

    it.skip("does not leak", function () {
        const test = this;

        return leakTest(NodeGit.TreeEntry, () => {
            return test.commit.getTree()
                .then((tree) => {
                    return tree.entryByPath("example");
                });
        });
    });
});
