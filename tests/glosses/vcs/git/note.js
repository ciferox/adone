const {
    std: { path },
    vcs: { git: { Repository, Note, Signature } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Note", () => {
    const reposPath = local("repos/workdir");

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;

            return repository.getMasterCommit().then((commit) => {
                test.commit = commit;
            });
        });
    });

    it("can be created", function () {
        const sha = this.commit.id();
        const sig = Signature.create("John", "john@doe.com", Date.now(), 0);
        const noteRef = "refs/notes/commits";

        return Note.create(this.repository, noteRef, sig, sig, sha, "Testing!", 1);
    });

    it("can be read", function () {
        const sha = this.commit.id();
        const noteRef = "refs/notes/commits";

        return Note.read(this.repository, noteRef, sha).then((note) => {
            assert.equal(note.message(), "Testing!");
        });
    });

    it("can iterate all notes", function () {
        const test = this;
        const noteRef = "refs/notes/commits";
        let ref = null;

        return Note.foreach(this.repository, noteRef, (blobId, objectId) => {
            ref = objectId;
        }).then(() => {
            return Note.read(test.repository, noteRef, ref).then((note) => {
                assert.equal(note.message(), "Testing!");
            });
        });
    });

    it("can be removed", function (done) {
        const test = this;
        const sha = this.commit.id();
        const noteRef = "refs/notes/commits";
        const sig = Signature.create("John", "john@doe.com", Date.now(), 0);

        return Note.create(this.repository, noteRef, sig, sig, sha, "Testing!", 1).then((noteSha) => Note.remove(this.repository, noteRef, sig, sig, sha)).then(() => {
            return Note.read(test.repository, noteRef, sha).catch((ex) => {
                assert.equal(ex.message, "note could not be found");
                done();
            });
        }).catch(done);
    });
});
