const {
    fs,
    std: { path },
    vcs: { git: { Repository, Status, StatusList } },
    system: { process: { shell } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("StatusList", () => {
    const reposPath = local("repos/workdir");

    before(function () {
        const test = this;
        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
        });
    });

    it("gets status with deltas", function () {
        const fileName = "my-new-file-that-shouldnt-exist.file";
        const fileContent = "new file from status tests";
        const repo = this.repository;
        const filePath = path.join(repo.workdir(), fileName);
        return shell("git clean -xdf", { cwd: reposPath }).then(() => {
            return fs.writeFile(filePath, fileContent);
        }).then(() => {
            const opts = {
                flags: Status.OPT.INCLUDE_UNTRACKED +
                Status.OPT.RECURSE_UNTRACKED_DIRS
            };

            return StatusList.create(repo, opts);
        }).then((list) => {
            assert.equal(list.entrycount(), 1);

            for (let i = 0; i < list.entrycount(); i++) {
                const entry = Status.byIndex(list, i);
                assert.equal(entry.indexToWorkdir().newFile().path(), fileName);
            }
        }).then(() => {
            return fs.rm(filePath);
        }).catch((e) => {
            return fs.rm(filePath).then(() => {
                return Promise.reject(e);
            });

        });
    });
});
