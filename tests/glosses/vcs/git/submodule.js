import RepoUtils from "./utils/repository_setup";
const {
    std: { path },
    vcs: { git: { Repository, Submodule, Object: Obj } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Submodule", () => {
    const repoPath = local("repos/submodule");

    beforeEach(function () {
        const test = this;

        return RepoUtils.createRepository(repoPath).then((repo) => {
            test.repository = repo;
            return Repository.open(local("repos/workdir"));
        }).then((repo) => {
            test.workdirRepository = repo;
        });
    });

    it("can walk over the submodules", function () {
        const repo = this.workdirRepository;
        const submoduleName = "vendor/libgit2";

        return repo.getSubmoduleNames().then((submodules) => {
            assert.equal(submodules.length, 1);

            const submodule = submodules[0];
            assert.equal(submodule, submoduleName);
            return submodule;
        }).then((submodule) => {
            return Submodule.lookup(repo, submodule);
        }).then((submodule) => {
            assert.equal(submodule.name(), submoduleName);
        });
    });

    it("can get submodule status", function () {
        const repo = this.workdirRepository;
        const submoduleName = "vendor/libgit2";

        return Submodule.status(repo, submoduleName, Submodule.IGNORE.NONE).then((status) => {
            assert.equal(Submodule.STATUS.IN_CONFIG, status);
        });
    });

    it("can get submodule location", function () {
        const repo = this.workdirRepository;
        const submoduleName = "vendor/libgit2";

        return Submodule.lookup(repo, submoduleName).then((submodule) => {
            return submodule.location();
        }).then((status) => {
            assert.equal(Submodule.STATUS.IN_CONFIG, status);
        });
    });

    it("can set submodule ignore", function () {
        const repo = this.workdirRepository;
        const submoduleName = "vendor/libgit2";

        return Submodule.setIgnore(repo, submoduleName, Submodule.IGNORE.ALL).then(() => {
            return Submodule.lookup(repo, submoduleName);
        }).then((submodule) => {
            assert.equal(Submodule.IGNORE.ALL, submodule.ignore());
        });
    });

    it("can set submodule url", function () {
        const repo = this.workdirRepository;
        const submoduleName = "vendor/libgit2";
        const submoduleUrl = "https://github.com/githubtraining/hellogitworld.git";

        return Submodule.setUrl(repo, submoduleName, submoduleUrl).then(() => {
            return Submodule.lookup(repo, submoduleName);
        }).then((submodule) => {
            assert.equal(submoduleUrl, submodule.url());
        });
    });

    it("can set submodule update", function () {
        const repo = this.workdirRepository;
        const submoduleName = "vendor/libgit2";

        return Submodule.setUpdate(repo, submoduleName, Submodule.UPDATE.NONE).then(() => {
            return Submodule.lookup(repo, submoduleName);
        }).then((submodule) => {
            assert.equal(Submodule.UPDATE.NONE, submodule.updateStrategy());
        });
    });

    it("can setup and finalize submodule add", function () {
        this.timeout(30000);

        const repo = this.repository;
        const submodulePath = "nodegittest";
        const submoduleUrl = "https://github.com/nodegit/test.git";

        let submodule;
        let submoduleRepo;

        return Submodule.addSetup(repo, submoduleUrl, submodulePath, 0).then((_submodule) => {
            submodule = _submodule;

            return submodule.init(0);
        }).then(() => {
            return submodule.open();
        }).then((_submoduleRepo) => {
            submoduleRepo = _submoduleRepo;
            return submoduleRepo.fetch("origin", null, null);
        }).then(() => {
            return submoduleRepo.getReference("origin/master");
        }).then((reference) => {
            return reference.peel(Obj.TYPE.COMMIT);
        }).then((commit) => {
            return submoduleRepo.createBranch("master", commit.id());
        }).then(() => {
            return submodule.addFinalize();
        }).then(() => {
            // check whether the submodule exists
            return Submodule.lookup(repo, submodulePath);
        }).then((submodule) => {
            assert.equal(submodule.name(), submodulePath);
            // check whether .gitmodules and the submodule are in the index
            return repo.refreshIndex();
        }).then((index) => {
            const entries = index.entries();
            assert.equal(entries.length, 2);
            assert.equal(entries[0].path, ".gitmodules");
            assert.equal(entries[1].path, submodulePath);
        });
    });
});
