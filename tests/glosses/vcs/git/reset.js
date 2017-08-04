const {
    fs,
    std: { path },
    vcs: { git: { Repository, Reset, AnnotatedCommit } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");


describe("Reset", () => {
    const reposPath = local("repos/workdir");
    const currentCommitOid = "32789a79e71fbc9e04d3eff7425e1771eb595150";
    const previousCommitOid = "c82fb078a192ea221c9f1093c64321c60d64aa0d";
    const filePath = "package.json";

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repo = repository;

            return test.repo.getCommit(currentCommitOid);
        }).then((commit) => {
            test.currentCommit = commit;

            return commit.getEntry(filePath);
        }).then((entry) => {
            return entry.getBlob();
        }).then((blob) => {
            test.currentCommitBlob = blob;

            return test.repo.getCommit(previousCommitOid);
        }).then((commit) => {
            test.previousCommit = commit;

            return commit.getEntry(filePath);
        }).then((entry) => {
            return entry.getBlob();
        }).then((blob) => {
            test.previousCommitBlob = blob;
        });
    });

    it("can reset a file to a previous commit", function () {
        const test = this;

        return Reset.default(test.repo, test.previousCommit, filePath).then(() => {
            return test.repo.refreshIndex();
        }).then((index) => {
            return index.writeTree();
        }).then((oid) => {
            return test.repo.getTree(oid);
        }).then((tree) => {
            return tree.getEntry(filePath);
        }).then((entry) => {
            return entry.getBlob();
        }).then((blob) => {
            const currentCommitContents = test.currentCommitBlob.toString();
            const previousCommitContents = test.previousCommitBlob.toString();
            const resetContents = blob.toString();

            assert(resetContents !== currentCommitContents);
            assert(resetContents === previousCommitContents);
        }).then(() => {
            return Reset.default(test.repo, test.currentCommit, filePath);
        }).then(() => {
            return test.repo.refreshIndex();
        }).then((index) => {
            return index.writeTree();
        }).then((oid) => {
            return test.repo.getTree(oid);
        }).then((tree) => {
            return tree.getEntry(filePath);
        }).then((entry) => {
            return entry.getBlob();
        }).then((blob) => {
            const currentCommitContents = test.currentCommitBlob.toString();
            const previousCommitContents = test.previousCommitBlob.toString();
            const resetContents = blob.toString();

            assert(resetContents === currentCommitContents);
            assert(resetContents !== previousCommitContents);
        });
    });

    const resetFrom = (repo, commit, resetType, annotated) => {
        let promise = null;
        if (annotated) {
            promise = AnnotatedCommit.lookup(repo, commit.id()).then((annotatedCommit) => {
                return Reset.fromAnnotated(repo, annotatedCommit, resetType);
            });
        } else {
            promise = Reset.reset(repo, commit, resetType);
        }
        return promise.then(() => {
            return repo.refreshIndex();
        }).then((index) => {
            return index.writeTree();
        }).then((oid) => {
            return repo.getTree(oid);
        }).then((tree) => {
            return tree.getEntry(filePath);
        }).then((entry) => {
            return entry.getBlob();
        });
    };

    it("can perform a soft reset", function () {
        const test = this;

        return resetFrom(test.repo, test.previousCommit, Reset.TYPE.SOFT, false).then((blob) => {
            const currentCommitContents = test.currentCommitBlob.toString();
            const previousCommitContents = test.previousCommitBlob.toString();
            const resetContents = blob.toString();

            // With a soft reset all of the changes should be in the index
            // still so the index should still == what we had at the current
            // commit and not the one nwe reset to
            assert(resetContents === currentCommitContents);
            assert(resetContents !== previousCommitContents);

            return Reset(test.repo, test.currentCommit, Reset.TYPE.HARD);
        });
    });

    it("can perform an annotated soft reset", function () {
        const test = this;

        return resetFrom(test.repo, test.previousCommit, Reset.TYPE.SOFT, true).then((blob) => {
            const currentCommitContents = test.currentCommitBlob.toString();
            const previousCommitContents = test.previousCommitBlob.toString();
            const resetContents = blob.toString();

            // With a soft reset all of the changes should be in the index
            // still so the index should still == what we had at the current
            // commit and not the one nwe reset to
            assert(resetContents === currentCommitContents);
            assert(resetContents !== previousCommitContents);

            return Reset(test.repo, test.currentCommit, Reset.TYPE.HARD);
        });
    });

    it("can perform a mixed reset", function () {
        const test = this;

        return resetFrom(test.repo, test.previousCommit, Reset.TYPE.MIXED, false).then((blob) => {
            const currentCommitContents = test.currentCommitBlob.toString();
            const previousCommitContents = test.previousCommitBlob.toString();
            const resetContents = blob.toString();

            // With a mixed reset all of the changes should removed from the index
            // but still in the working directory. (i.e. unstaged)
            assert(resetContents !== currentCommitContents);
            assert(resetContents === previousCommitContents);

            return fs.readFile(path.join(test.repo.workdir(), filePath), { encoding: "utf8" });
        }).then((fileContents) => {
            const currentCommitContents = test.currentCommitBlob.toString();

            assert(fileContents === currentCommitContents);

            return Reset.reset(test.repo, test.currentCommit, Reset.TYPE.HARD);
        });
    });

    it("can perform an annotated mixed reset", function () {
        const test = this;

        return resetFrom(test.repo, test.previousCommit, Reset.TYPE.MIXED, true).then((blob) => {
            const currentCommitContents = test.currentCommitBlob.toString();
            const previousCommitContents = test.previousCommitBlob.toString();
            const resetContents = blob.toString();

            // With a mixed reset all of the changes should removed from the index
            // but still in the working directory. (i.e. unstaged)
            assert(resetContents !== currentCommitContents);
            assert(resetContents === previousCommitContents);

            return fs.readFile(path.join(test.repo.workdir(), filePath), { encoding: "utf8" });
        }).then((fileContents) => {
            const currentCommitContents = test.currentCommitBlob.toString();

            assert(fileContents === currentCommitContents);

            return Reset.reset(test.repo, test.currentCommit, Reset.TYPE.HARD);
        });
    });

    it("can perform a hard reset", function () {
        const test = this;

        return resetFrom(test.repo, test.previousCommit, Reset.TYPE.HARD, false).then((blob) => {
            const currentCommitContents = test.currentCommitBlob.toString();
            const previousCommitContents = test.previousCommitBlob.toString();
            const resetContents = blob.toString();

            // With a hard reset all of the changes should removed from the index
            // and also removed from the working directory
            assert(resetContents !== currentCommitContents);
            assert(resetContents === previousCommitContents);

            return fs.readFile(path.join(test.repo.workdir(), filePath), { encoding: "utf8" });
        }).then((fileContents) => {
            const previousCommitContents = test.previousCommitBlob.toString();

            assert(fileContents === previousCommitContents);

            return Reset.reset(test.repo, test.currentCommit, Reset.TYPE.HARD);
        });
    });

    it("can perform an annotated hard reset", function () {
        const test = this;

        return resetFrom(test.repo, test.previousCommit, Reset.TYPE.HARD, true).then((blob) => {
            const currentCommitContents = test.currentCommitBlob.toString();
            const previousCommitContents = test.previousCommitBlob.toString();
            const resetContents = blob.toString();

            // With a hard reset all of the changes should removed from the index
            // and also removed from the working directory
            assert(resetContents !== currentCommitContents);
            assert(resetContents === previousCommitContents);

            return fs.readFile(path.join(test.repo.workdir(), filePath), { encoding: "utf8" });
        }).then((fileContents) => {
            const previousCommitContents = test.previousCommitBlob.toString();

            assert(fileContents === previousCommitContents);

            return Reset.reset(test.repo, test.currentCommit, Reset.TYPE.HARD);
        });
    });
});
