const {
    std: { path },
    vcs: { git: { Repository, Packbuilder } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Packbuilder", () => {
    const reposPath = local("repos/workdir");

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
        });
    });

    it("can be initialized", function () {
        const packBuilder = Packbuilder.create(this.repository);

        assert(packBuilder instanceof Packbuilder);
    });
});
