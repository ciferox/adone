import RepoUtils from "./utils/repository_setup";
const {
    std: { path },
    vcs: { git: { Blame } }
} = adone;
const local = path.join.bind(path, __dirname, "fixtures");

describe("Blame", () => {
    let test;
    const fileName = "foobar.js";
    const repoPath = local("repos/blameRepo");

    beforeEach(function () {
        test = this;

        return RepoUtils.createRepository(repoPath).then((repository) => {
            test.repository = repository;

            return RepoUtils.commitFileToRepo(repository, fileName, "line1\nline2\nline3");
        });
    });

    it("can initialize blame without options", () => {
        return Blame.file(test.repository, fileName).then((blame) => {
            assert(blame);
        });
    });
});
