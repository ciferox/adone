import { garbageCollect } from "./utils/garbage_collect.js";
import { leakTest } from "./utils/leak_test";

const {
    is,
    fs,
    std: { path },
    vcs: { git: { Commit, Reference, Repository, Signature, Diff, Reflog, Oid } }
} = adone;
const exec = adone.system.process.shell;


const local = path.join.bind(path, __dirname, "fixtures");

describe("Commit", () => {
    const reposPath = local("repos/workdir");
    const oid = "fce88902e66c72b5b93e75bdb5ae717038b221f6";

    const reinitialize = (test) => {
        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;

            return repository.getCommit(oid);
        }).then((commit) => {
            test.commit = commit;
        });
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

            return repo.createCommit("HEAD", author, committer, "message", treeOid, [parent]);
        });
    };

    const undoCommit = () => exec("git reset --hard HEAD~1", { cwd: reposPath });

    beforeEach(function () {
        return reinitialize(this);
    });

    it("will fail with an invalid sha", function () {
        return this.repository.getCommit("invalid").then(null, (err) => {
            assert.ok(err instanceof Error);
        });
    });

    it("has a message", function () {
        assert.equal(this.commit.message(), "Update README.md");
    });

    it("has a raw message", function () {
        assert.equal(this.commit.messageRaw(), "Update README.md");
    });

    it("has a message encoding", function () {
        const encoding = this.commit.messageEncoding();
        assert.ok(encoding === "UTF-8" || is.undefined(encoding));
    });

    it("has a summary", function () {
        assert.equal(this.commit.summary(), "Update README.md");
    });

    it("has a sha", function () {
        assert.equal(this.commit.sha(), oid);
    });

    it("has a time", function () {
        assert.equal(this.commit.timeMs(), 1362012884000);
    });

    it("has a date", function () {
        assert.equal(this.commit.date().getTime(), 1362012884000);
    });

    it("has a time offset", function () {
        assert.equal(this.commit.timeOffset(), 780);
    });

    it("can create a commit", function () {
        const test = this;
        const expectedCommitId = "315e77328ef596f3bc065d8ac6dd2c72c09de8a5";
        const fileName = "newfile.txt";
        const fileContent = "hello world";

        let repo;
        let index;
        let treeOid;
        let parent;

        return Repository.open(reposPath).then((repoResult) => {
            repo = repoResult;
            return fs.writeFile(path.join(repo.workdir(), fileName), fileContent);
        }).then(() => {
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

            return repo.createCommit(
                "HEAD",
                author,
                committer,
                "message",
                treeOid,
                [parent]);
        }).then((commitId) => {
            assert.equal(expectedCommitId, commitId);
            return undoCommit().then(() => {
                return reinitialize(test);
            });
        }, (reason) => {
            return reinitialize(test).then(() => {
                return Promise.reject(reason);
            });
        });
    });

    it("can amend commit", () => {
        const commitToAmendId = "315e77328ef596f3bc065d8ac6dd2c72c09de8a5";
        const expectedAmendedCommitId = "57836e96555243666ea74ea888310cc7c41d4613";
        const fileName = "newfile.txt";
        const fileContent = "hello world";
        const newFileName = "newerfile.txt";
        const newFileContent = "goodbye world";
        const messageEncoding = "US-ASCII";
        const message = "First commit";

        let repo;
        let index;
        let treeOid;
        let parent;
        let author;
        let committer;
        let amendedCommitId;

        return Repository.open(reposPath).then((repoResult) => {
            repo = repoResult;
            return fs.writeFile(path.join(repo.workdir(), fileName), fileContent);
        }).then(() => {
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

            return repo.createCommit("HEAD", author, committer, "message", treeOid, [parent]);
        }).then(() => {
            return fs.writeFile(path.join(repo.workdir(), newFileName), newFileContent);
        }).then(() => {
            return repo.refreshIndex();
        }).then((indexResult) => {
            index = indexResult;
        }).then(() => {
            return index.addByPath(newFileName);
        }).then(() => {
            return index.write();
        }).then(() => {
            return index.writeTree();
        }).then((resultOid) => {
            treeOid = resultOid;
            return Promise.all([
                repo.getCommit(commitToAmendId),
                Signature.create("New Foo Bar", "newfoo@bar.com", 246802468, 12),
                Signature.create("New Foo A Bar", "newfoo@bar.com", 4807891730, 32)
            ]);
        }).then((amendInfo) => {
            const commit = amendInfo[0];
            author = amendInfo[1];
            committer = amendInfo[2];
            return commit.amend("HEAD", author, committer, messageEncoding, message, treeOid);
        }).then((commitId) => {
            amendedCommitId = commitId;
            return undoCommit();
        }).then(() => {
            assert.equal(amendedCommitId, expectedAmendedCommitId);
        });
    });

    it("can amend commit and update reference separately", () => {
        const customReflogMessage = "updating reference manually";

        let head;
        let repo;
        let oid;
        let originalReflogCount;

        return Repository.open(reposPath).then((repoResult) => {
            repo = repoResult;
            // grab the original reflog entry count (to make sure .amend
            // doesn't add a reflog entry when not given a reference)
            return Reflog.read(repo, "HEAD");
        }).then((reflog) => {
            originalReflogCount = reflog.entrycount();
            // get the head reference and commit
            return repo.head();
        }).then((headResult) => {
            head = headResult;
            return repo.getHeadCommit();
        }).then((headCommit) => {
            // amend the commit but don't update any reference
            // (passing null as update_ref)
            return headCommit.amend(null, null, null, "message", null, null);
        }).then((oidResult) => {
            oid = oidResult;
            // update the reference manually
            return head.setTarget(oid, customReflogMessage);
        }).then(() => {
            // load reflog and make sure the last message is what we expected
            return Reflog.read(repo, "HEAD");
        }).then((reflog) => {
            const reflogEntry = reflog.entryByIndex(0);
            assert.equal(reflogEntry.message(), customReflogMessage);
            assert.equal(reflogEntry.idNew().toString(), oid);
            // only setTarget should have added to the entrycount
            assert.equal(reflog.entrycount(), originalReflogCount + 1);
        });
    });

    it("has an owner", function () {
        const owner = this.commit.owner();
        assert.ok(owner instanceof Repository);
    });

    it("can walk its repository's history", function (done) {
        let historyCount = 0;
        const expectedHistoryCount = 364;

        const history = this.commit.history();

        history.on("commit", (commit) => {
            historyCount++;
        });

        history.on("end", (commits) => {
            assert.equal(historyCount, expectedHistoryCount);
            assert.equal(commits.length, expectedHistoryCount);

            done();
        });

        history.on("error", (err) => {
            assert.ok(false);
        });

        history.start();
    });

    it("can fetch the master branch HEAD", function () {
        const repository = this.repository;

        return repository.getBranchCommit("master").then((commit) => {
            return repository.getCommit(commit.sha());
        });
    });

    it("can fetch all of its parents", function () {
        return this.commit.getParents().then((parents) => {
            assert.equal(parents.length, 1);

            const sha = parents[0].sha();
            assert.equal(sha, "ecfd36c80a3e9081f200dfda2391acadb56dac27");
        });
    });

    it("can specify a parents limit", function () {
        return this.commit.getParents(0).then((parents) => {
            assert.equal(parents.length, 0);
        });
    });

    it("can specify limit higher than actual parents", function () {
        return this.commit.getParents(2).then((parents) => {
            assert.equal(parents.length, 1);
        });
    });

    it("can fetch parents of a merge commit", () => {
        return Repository.open(reposPath).then((repo) => {
            return repo.getCommit("bf1da765e357a9b936d6d511f2c7b78e0de53632");
        }).then((commit) => {
            return commit.getParents();
        }).then((parents) => {
            assert.equal(parents.length, 2);
        });
    });

    it("has a parent count", function () {
        assert.equal(1, this.commit.parentcount());
    });

    it("can retrieve and walk a commit tree", function () {
        let commitTreeEntryCount = 0;
        const expectedCommitTreeEntryCount = 198;

        return this.commit.getTree().then((tree) => {
            return new Promise(((resolve, fail) => {

                const treeWalker = tree.walk();

                treeWalker.on("entry", (entry) => {
                    commitTreeEntryCount++;
                });

                treeWalker.on("error", (error) => {
                    fail(error);
                });

                treeWalker.on("end", (entries) => {
                    try {
                        assert.equal(commitTreeEntryCount, expectedCommitTreeEntryCount);
                        resolve();
                    } catch (e) {
                        fail(e);
                    }
                });

                treeWalker.start();
            }));
        });
    });

    it("can get the commit diff", function () {
        return this.commit.getDiff().then((diff) => {
            assert.equal(diff.length, 1);
        });
    });

    // it("can get the commit diff in large context", function() {
    // For displaying the full file we can set context_lines of options.
    // Eventually this should work, but right now there is a
    // comment in diff.c in libgit2 of "/* TODO: parse thresholds */"
    // It will add the "--unified" but not with the "=x" part.
    // options.context_lines = 20000;
    // });

    it("can get the commit diff without whitespace", () => {
        let repo;
        const options = {};
        const GIT_DIFF_IGNORE_WHITESPACE = (1 << 22);
        options.flags = GIT_DIFF_IGNORE_WHITESPACE;

        const fileName = "whitespacetest.txt";
        const fileContent = "line a\nline b\nline c\nline d\n	line e\nline f\n" +
            "line g\nline h\nline i\n		line j\nline k\nline l\n" +
            "line m\nline n\n			line o\nline p\nline q\n" +
            "line r\nline s\nline t\nline u\nline v\nline w\n" +
            "line x\nline y\nline z\n";
        const changedFileContent = "line a\nline b\n        line c\nline d\n" +
            "line e\nline f\nline g\n  line h\nline i\nline j\n" +
            "line k\nline l\nline m\nline n\nline o\nlinep\n" +
            " line q\nline r\nline   s\nline t\n\nline u\n" +
            "line v1\nline w\nline x\n			\nline y\nline z\n";

        return Repository.open(reposPath).then((repoResult) => {
            repo = repoResult;
            return commitFile(repo, fileName, fileContent, "commit this");
        }).then(() => {
            return commitFile(repo, fileName, changedFileContent, "commit that");
        }).then(() => {
            return repo.getHeadCommit();
        }).then((wsCommit) => {
            return wsCommit.getDiffWithOptions(options);
        }).then((diff) => {

            assert.equal(diff.length, 1);
            return diff[0].patches();
        }).then((patches) => {
            assert.equal(patches.length, 1);
            const patch = patches[0];

            assert.equal(patch.oldFile().path(), fileName);
            assert.equal(patch.newFile().path(), fileName);
            assert.ok(patch.isModified());

            return patch.hunks();
        }).then((hunks) => {
            return hunks[0].lines();
        }).then((lines) => {
            //check all hunk lines
            assert.equal(lines.length, 12);
            assert.equal(lines[0].origin(), Diff.LINE.CONTEXT);

            assert.equal(lines[1].content().length, 9);
            assert.equal(lines[1].content(), "line   s\n");
            assert.equal(lines[1].origin(), Diff.LINE.CONTEXT);

            assert.equal(lines[2].origin(), Diff.LINE.CONTEXT);

            assert.equal(lines[3].content().length, 1);
            assert.equal(lines[3].content(), "\n");
            assert.equal(lines[3].origin(), Diff.LINE.ADDITION);

            assert.equal(lines[4].origin(), Diff.LINE.CONTEXT);

            assert.equal(lines[5].content().length, 7);
            assert.equal(lines[5].content(), "line v\n");
            assert.equal(lines[5].origin(), Diff.LINE.DELETION);

            assert.equal(lines[6].content().length, 8);
            assert.equal(lines[6].content(), "line v1\n");
            assert.equal(lines[6].origin(), Diff.LINE.ADDITION);

            assert.equal(lines[7].origin(), Diff.LINE.CONTEXT);

            assert.equal(lines[8].origin(), Diff.LINE.CONTEXT);

            assert.equal(lines[9].content().length, 4);
            assert.equal(lines[9].content(), "\t\t\t\n");
            assert.equal(lines[9].origin(), Diff.LINE.ADDITION);

            assert.equal(lines[10].origin(), Diff.LINE.CONTEXT);

            assert.equal(lines[11].origin(), Diff.LINE.CONTEXT);
        });
    });

    it("can get header fields", function () {
        const commit = this.commit;
        return commit.headerField("parent").then((field) => {
            assert.equal(field, "ecfd36c80a3e9081f200dfda2391acadb56dac27");
            return commit.headerField("author");
        }).then((field) => {
            assert.equal(field, "Michael Robinson <mike@panmedia.co.nz> 1362012884 +1300");
            return commit.headerField("committer");
        }).then((field) => {
            assert.equal(field, "Michael Robinson <mike@panmedia.co.nz> 1362012884 +1300");
        });
    });

    it("can lookup using a short id", () => {
        return Repository.open(reposPath).then((repo) => {
            return Commit.lookupPrefix(repo, Oid.fromString("bf1da765"), 8);
        }).then((commit) => {
            assert.equal(commit.id().toString(), "bf1da765e357a9b936d6d511f2c7b78e0de53632");
        });
    });

    it("can find nth gen ancestor", () => {
        return Repository.open(reposPath).then((repo) => {
            return repo.getCommit("b52067acaa755c3b3fc21b484ffed2bce4150f62");
        }).then((commit) => {
            return commit.nthGenAncestor(3);
        }).then((commit) => {
            assert.equal(commit.id().toString(), "9b2f3a37d46d47248d2704b6a46ec7e197bcd48c");
        });
    });

    describe("Commit's Author", () => {
        before(function () {
            this.author = this.commit.author();
        });

        it("is available", function () {
            assert.ok(this.author instanceof Signature);
        });

        it("has a name", function () {
            assert.equal(this.author.name(), "Michael Robinson");
        });

        it("has an email", function () {
            assert.equal(this.author.email(), "mike@panmedia.co.nz");
        });
    });

    describe("Commit's Committer", () => {
        before(function () {
            this.committer = this.commit.committer();
        });

        it("is available", function () {
            assert.ok(this.committer instanceof Signature);
        });

        it("has a name", function () {
            assert.equal(this.committer.name(), "Michael Robinson");
        });

        it("has an email", function () {
            assert.equal(this.committer.email(), "mike@panmedia.co.nz");
        });
    });

    describe("Commit's Body", () => {

        it("null if only summary", function () {
            const test = this;
            return Commit.lookup(test.repository, "15315cf41ad76400d9189c85a5827b77b8c392f1").then((commit) => {
                assert.equal(commit.body(), null);
            });
        });

        it("non-null when body exists", function () {
            const test = this;
            return Commit.lookup(test.repository, "c82fb078a192ea221c9f1093c64321c60d64aa0d").then((commit) => {
                assert.equal(commit.body(),
                    "Added new methods in checkout and repository");
            });
        });
    });

    it("does not leak", function () {
        const test = this;

        return leakTest(Commit, () => {
            return Commit.lookup(test.repository, oid);
        });
    });

    it("duplicates signature", function () {
        garbageCollect();
        const startSelfFreeingCount = Signature.getSelfFreeingInstanceCount();
        const startNonSelfFreeingCount = Signature.getNonSelfFreeingConstructedCount();
        let signature = this.commit.author();

        garbageCollect();
        let endSelfFreeingCount = Signature.getSelfFreeingInstanceCount();
        const endNonSelfFreeingCount = Signature.getNonSelfFreeingConstructedCount();
        // we should get one duplicated, self-freeing signature
        assert.equal(startSelfFreeingCount + 1, endSelfFreeingCount);
        assert.equal(startNonSelfFreeingCount, endNonSelfFreeingCount);

        signature = null;
        garbageCollect();
        endSelfFreeingCount = Signature.getSelfFreeingInstanceCount();
        // the self-freeing signature should get freed
        assert.equal(startSelfFreeingCount, endSelfFreeingCount);
    });
});
