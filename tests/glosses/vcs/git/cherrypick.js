import RepoUtils from "./utils/repository_setup";
const {
    fs,
    std: { path },
    vcs: { git: { Cherrypick, Repository, Checkout, Stash } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Cherrypick", () => {
    const repoPath = local("repos/cherrypick");

    beforeEach(function () {
        const test = this;
        return RepoUtils.createRepository(repoPath).then((repo) => {
            test.repository = repo;
        });
    });

    after(() => {
        // return fs.rm(repoPath);
    });

    it("can cherrypick a commit onto the index", async function () {
        const repo = this.repository;
        const workDirPath = repo.workdir();

        const info = await RepoUtils.setupBranches(repo, true);
        const repoInfo = info;

        assert.isTrue(!(await fs.exists(path.join(workDirPath, repoInfo.theirFileName))), `${repoInfo.theirFileName} shouldn't exist`);

        await Cherrypick.cherrypick(repo, repoInfo.theirCommit, {});
        assert.isTrue(await fs.exists(path.join(workDirPath, repoInfo.theirFileName)), `${repoInfo.theirFileName} should exist`);

        // Cherrypick.cherrypick leaves the repo in a cherrypick state
        assert.equal(repo.state(), Repository.STATE.CHERRYPICK);
        assert.ok(repo.isCherrypicking());

        // cleanup
        assert.equal(repo.stateCleanup(), 0);
        assert.equal(repo.state(), Repository.STATE.NONE);
        assert.ok(repo.isDefaultState());
    });

    it("can cherrypick a commit onto another specified commit", async function () {
        const repo = this.repository;
        const workDirPath = repo.workdir();

        const info = await RepoUtils.setupBranches(repo);
        const repoInfo = info;

        assert.isTrue(!(await fs.exists(path.join(workDirPath, repoInfo.ourFileName))), `${repoInfo.ourFileName} shouldn't exist`);
        assert.isTrue(!(await fs.exists(path.join(workDirPath, repoInfo.theirFileName))), `${repoInfo.theirFileName} shouldn't exist`);

        const index = await Cherrypick.commit(repo, repoInfo.theirCommit, repoInfo.ourCommit, 0, {});
        assert(index);
        const oid = await index.writeTreeTo(repo);
        const tree = await repo.getTree(oid);
        const opts = {
            checkoutStrategy: Checkout.STRATEGY.FORCE
        };

        await Checkout.tree(repo, tree, opts);
        assert(await fs.exists(path.join(workDirPath, repoInfo.ourFileName)), `${repoInfo.ourFileName} should exist`);
        assert(await fs.exists(path.join(workDirPath, repoInfo.theirFileName)), `${repoInfo.theirFileName} should exist`);
    });

    it("can cherrypick a stash to apply it", async function () {
        const repo = this.repository;
        const workDirPath = repo.workdir();

        const addedContent = "\nIt makes things E-Z!";

        const info = await RepoUtils.setupBranches(repo, true);
        const repoInfo = info;

        let statuses = await repo.getStatus();
        assert.equal(statuses.length, 0);

        await fs.writeFile(path.join(workDirPath, repoInfo.ourFileName), repoInfo.ourFileContent + addedContent);
        statuses = await repo.getStatus();
        assert.equal(statuses.length, 1);

        const oid = await Stash.save(repo, repoInfo.ourSignature, "our stash", 0);
        const cherrypickOid = oid;

        let fileContent = await fs.readFile(path.join(workDirPath, repoInfo.ourFileName));
        assert.equal(fileContent, repoInfo.ourFileContent);

        statuses = await repo.getStatus();
        assert.equal(statuses.length, 0);

        const commit = await repo.getCommit(cherrypickOid);
        const opts = {
            mainline: 1
        };

        await Cherrypick.cherrypick(repo, commit, opts);
        statuses = await repo.getStatus();
        assert.equal(statuses.length, 1);

        fileContent = await fs.readFile(path.join(workDirPath, repoInfo.ourFileName));
        assert.equal(fileContent, repoInfo.ourFileContent + addedContent);
    });
});
