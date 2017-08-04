const {
    std: { path },
    vcs: { git: { Repository, AnnotatedCommit, Branch } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");
const reposPath = local("repos/workdir");
const branchName = "master";

describe("AnnotatedCommit", () => {
    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
        });
    });

    it("can create an AnnotatedCommit from a ref", function () {
        const test = this;

        return Branch.lookup(test.repository, branchName, Branch.BRANCH.LOCAL).then((ref) => {
            return AnnotatedCommit.fromRef(test.repository, ref);
        }).then((annotatedCommit) => {
            assert(annotatedCommit.id());
        });
    });

    it("can free an AnnotatedCommit after creating it", function () {
        const test = this;

        return Branch.lookup(test.repository, branchName, Branch.BRANCH.LOCAL).then((ref) => {
            return AnnotatedCommit.fromRef(test.repository, ref);
        }).then((annotatedCommit) => {
            // Annotated commit should exist
            assert(annotatedCommit.id());

            // Free the annotated commit
            annotatedCommit.free();

            // Getting the id should now throw because the commit was freed
            assert.throws(annotatedCommit.id);
        });
    });

    it("can lookup an AnnotatedCommit after creating it", function () {
        const test = this;
        let id;

        return Branch.lookup(test.repository, branchName, Branch.BRANCH.LOCAL).then((ref) => {
            return AnnotatedCommit.fromRef(test.repository, ref);
        }).then((annotatedCommit) => {
            id = annotatedCommit.id();
            return AnnotatedCommit.lookup(test.repository, id);
        }).then((annotatedCommit) => {
            assert(id, annotatedCommit.id());
        });
    });
});
