const {
    fs,
    std: { path },
    vcs: { git: {
        Repository,
        Checkout,
        Merge } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Checkout", () => {
    const readMeName = "README.md";
    const packageJsonName = "package.json";
    const reposPath = local("repos/workdir");
    const readMePath = local(`repos/workdir/${readMeName}`);
    const packageJsonPath = local(`repos/workdir/${packageJsonName}`);
    const checkoutBranchName = "checkout-test";

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repo) => {
            test.repository = repo;
        });
    });

    it("can checkout the head", function () {
        const test = this;

        return Checkout.head(test.repository).then((blob) => {
            const packageContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });

            assert.ok(~packageContent.indexOf("\"ejs\": \"~1.0.0\","));
        });
    });

    it("can force checkout a single file", async function () {
        const test = this;

        const packageContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });
        const readmeContent = fs.readFileSync(readMePath, { encoding: "utf8" });

        assert.notEqual(packageContent, "");
        assert.notEqual(readmeContent, "");

        try {
            await fs.mkdirp(path.dirname(readMePath));
        } catch (err) {
            //
        }
        await fs.writeFile(readMePath, "");

        try {
            await fs.mkdirp(path.dirname(packageJsonPath));
        } catch (err) {
            //
        }
        await fs.writeFile(packageJsonPath, "");

        const opts = {
            checkoutStrategy: Checkout.STRATEGY.FORCE,
            paths: packageJsonName
        };

        await Checkout.head(test.repository, opts);

        const resetPackageContent = await fs.readFile(packageJsonPath, { encoding: "utf8" });
        const resetReadmeContent = await fs.readFile(readMePath, { encoding: "utf8" });

        assert.equal(resetPackageContent, packageContent);
        assert.equal(resetReadmeContent, "");

        const resetOpts = {
            checkoutStrategy: Checkout.STRATEGY.FORCE
        };

        await Checkout.head(test.repository, resetOpts);
        const resetContent = await fs.readFile(readMePath, { encoding: "utf8" });
        assert.equal(resetContent, readmeContent);
    });

    it("can checkout by tree", function () {
        const test = this;

        return test.repository.getTagByName("annotated-tag").then((tag) => {
            return Checkout.tree(test.repository, tag);
        }).then(() => {
            return test.repository.getHeadCommit();
        }).then((commit) => {
            assert.equal(commit, "32789a79e71fbc9e04d3eff7425e1771eb595150");
        });
    });

    it("can checkout a branch", function () {
        const test = this;

        return test.repository.checkoutBranch(checkoutBranchName).then(() => {
            const packageContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });

            assert.ok(!~packageContent.indexOf("\"ejs\": \"~1.0.0\","));
        }).then(() => {
            return test.repository.getStatus();
        }).then((statuses) => {
            assert.equal(statuses.length, 0);
        }).then(() => {
            return test.repository.checkoutBranch("master");
        }).then(() => {
            const packageContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });

            assert.ok(~packageContent.indexOf("\"ejs\": \"~1.0.0\","));
        });
    });

    it("can checkout an index with conflicts", function () {
        const test = this;

        const testBranchName = "test";
        let ourCommit;

        return test.repository.getBranchCommit(checkoutBranchName).then((commit) => {
            ourCommit = commit;

            return test.repository.createBranch(testBranchName, commit.id());
        }).then(() => {
            return test.repository.checkoutBranch(testBranchName);
        }).then((branch) => {
            fs.writeFileSync(packageJsonPath, "\n");

            return test.repository.refreshIndex().then((index) => {
                return index.addByPath(packageJsonName).then(() => {
                    return index.write();
                }).then(() => {
                    return index.writeTree();
                });
            });
        }).then((oid) => {
            assert.equal(oid.toString(),
                "85135ab398976a4d5be6a8704297a45f2b1e7ab2");

            const signature = test.repository.defaultSignature();

            return test.repository.createCommit(`refs/heads/${testBranchName}`,
                signature, signature, "we made breaking changes", oid, [ourCommit]);
        }).then((commit) => {
            return Promise.all([
                test.repository.getBranchCommit(testBranchName),
                test.repository.getBranchCommit("master")
            ]);
        }).then((commits) => {
            return Merge.commits(test.repository, commits[0], commits[1], null);
        }).then((index) => {
            assert.ok(index);
            assert.ok(index.hasConflicts && index.hasConflicts());

            return Checkout.index(test.repository, index);
        }).then(() => {
            // Verify that the conflict has been written to disk
            const conflictedContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });

            assert.ok(~conflictedContent.indexOf("<<<<<<< ours"));
            assert.ok(~conflictedContent.indexOf("======="));
            assert.ok(~conflictedContent.indexOf(">>>>>>> theirs"));

            // Cleanup
            const opts = {
                checkoutStrategy: Checkout.STRATEGY.FORCE,
                paths: packageJsonName
            };

            return Checkout.head(test.repository, opts);
        }).then(() => {
            const finalContent = fs.readFileSync(packageJsonPath, { encoding: "utf8" });
            assert.equal(finalContent, "\n");
        });
    });
});
