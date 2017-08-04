const {
    is,
    std: { path },
    vcs: { git: { Repository, Reference, Reflog } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Reference", () => {
    const reposPath = local("repos/workdir");
    const refName = "refs/heads/master";

    before(function () {
        const test = this;

        return adone.system.process.shell("git reset --hard origin/master", { cwd: reposPath }).then(() => {
            return Repository.open(reposPath);
        }).then((repository) => {
            test.repository = repository;

            return repository.getReference(refName);
        }).then((reference) => {
            test.reference = reference;
        });
    });

    it("can look up a reference", function () {
        assert.ok(this.reference instanceof Reference);
    });

    it("can determine if the reference is symbolic", function () {
        assert.equal(this.reference.isSymbolic(), false);
    });

    it("can determine if the reference is not symbolic", function () {
        assert.ok(this.reference.isConcrete());
    });

    it("can check that reference is valid", function () {
        assert.ok(this.reference.isValid());
    });

    it("can return refName when casting toString", function () {
        assert.equal(this.reference.toString(), refName);
    });

    it("can compare two identical references", function () {
        assert.equal(this.reference.cmp(this.reference), 0);
    });

    it("can compare two different references", function () {
        const ref = this.reference;

        return this.repository.getReference("checkout-test").then((otherRef) => {
            assert.notEqual(ref.cmp(otherRef), 0);
        });
    });

    it("will return undefined looking up the symbolic target if not symbolic",
        function () {
            assert(is.undefined(this.reference.symbolicTarget()));
        });

    it("can look up the HEAD sha", function () {
        return Reference.nameToId(this.repository, "HEAD").then((oid) => {
            const sha = oid.allocfmt();
            assert.equal(sha, "32789a79e71fbc9e04d3eff7425e1771eb595150");
        });
    });

    it("can rename a reference", function () {
        const newRefName = "refs/heads/chasta-boran";
        const ref = this.reference;
        const repo = this.repository;
        const reflogMessage = "reflog message";
        const refExistsMessage = "Renamed ref still exists";

        return repo.getReference(newRefName).then(() => {
            // The new ref name should not exist yet
            throw new Error(refExistsMessage);
        }).catch((err) => {
            // Should throw an error explaining that the ref
            // does not exist
            assert.ok(err.message.includes(newRefName));
            return ref.rename(newRefName, 0, reflogMessage);
        }).then((reference) => {
            // The ref should be renamed at this point
            assert.equal(reference.name(), newRefName);
            return repo.getReference(refName);
        }).then(() => {
            // The original ref name should not be found
            throw new Error(refExistsMessage);
        }).catch((err) => {
            assert.ok(err.message.includes(refName));
            return Reflog.read(repo, newRefName);
        }).then((reflog) => {
            const refEntryMessage = reflog
                .entryByIndex(reflog.entrycount() - 1)
                .message();
            // The reflog should have the message passed to
            // the rename
            assert.equal(refEntryMessage, reflogMessage);
            return repo.getReference(newRefName);
        }).then((newRef) => {
            // Set the ref name back to `master`
            return newRef.rename(refName, 0, "another reflog message");
        });
    });
});
