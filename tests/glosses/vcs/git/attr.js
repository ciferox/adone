const {
    std: { path },
    vcs: { git: { Attr, Repository, Status } }
} = adone;
const local = path.join.bind(path, __dirname, "fixtures");

describe("Attr", () => {
    const reposPath = local("repos/workdir");

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath)
            .then((repository) => {
                test.repository = repository;
            });
    });

    it("can add a macro definition", function () {
        const error = Attr.addMacro(this.repository, "binary", "-diff -crlf");

        assert.equal(error, 0);
    });

    it("can flush the attr cache", function () {
        Attr.cacheFlush(this.repository);
    });

    it("can lookup the value of a git attribute", function () {
        const flags = Status.SHOW.INDEX_AND_WORKDIR;
        return Attr.get(this.repository, flags, ".gitattributes", "test");
    });
});
