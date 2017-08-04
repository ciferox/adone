const {
    is,
    std: { path },
    vcs: { git: { Oid, Repository, TreeEntry } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Blob", () => {
    const FileMode = TreeEntry.FILEMODE;

    const reposPath = local("repos/workdir");
    const oid = "111dd657329797f6165f52f5085f61ac976dcf04";

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;

            return repository.getBlob(oid);
        }).then((blob) => {
            test.blob = blob;
        });
    });

    it("can provide content as a buffer", function () {
        const contents = this.blob.content();

        assert.ok(is.buffer(contents));
    });

    it("can provide content as a string", function () {
        const contents = this.blob.toString();

        assert.equal(typeof contents, "string");
        assert.equal(contents.slice(0, 7), "@import");
    });

    it("can determine if a blob is not a binary", function () {
        assert.equal(this.blob.filemode(), FileMode.BLOB);
    });

    it("can get a blob with an Oid object", function () {
        const oidObject = Oid.fromString(oid);
        return this.repository.getBlob(oidObject).then((blob) => {
            assert.equal(blob.id().toString(), oid);
        });
    });
});
