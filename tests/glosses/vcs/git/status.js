const {
    fs,
    std: { path },
    vcs: { git: { Repository, Status } },
    system: { process: { shell } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Status", () => {
    const reposPath = local("repos/workdir");

    before(function () {
        const test = this;
        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
        });
    });

    it("gets no statuses on clean working directory", function () {
        const statuses = [];
        const statusCallback = function (path, status) {
            statuses.push({ path, status });
        };

        return Status.foreach(this.repository, statusCallback).then(() => {
            assert.equal(statuses.length, 0);
        });
    });

    it("gets a status on changing file directory", function () {
        const fileName = "README.md";
        const fileContent = "Cha-cha-cha-chaaaaaangessssss";
        const repo = this.repository;
        const filePath = path.join(repo.workdir(), fileName);
        let oldContent;
        const statuses = [];

        return fs.readFile(filePath).then((content) => {
            oldContent = content;
            return fs.writeFile(filePath, fileContent);
        }).then(() => {
            const statusCallback = function (path, status) {
                statuses.push({ path, status });
            };
            return Status.foreach(repo, statusCallback);
        }).then(() => {
            assert.equal(statuses.length, 1);
            assert.equal(statuses[0].path, fileName);
            assert.equal(statuses[0].status, 256);
        }).then(() => {
            return fs.writeFile(filePath, oldContent);
        }).catch((e) => {
            return fs.writeFile(filePath, oldContent).then(() => {
                return Promise.reject(e);
            });
        });
    });

    it("gets status with options", function () {
        const fileName = "my-new-file-that-shouldnt-exist.file";
        const fileContent = "new file from status tests";
        const repo = this.repository;
        const filePath = path.join(repo.workdir(), fileName);
        return shell("git clean -xdf", { cwd: reposPath }).then(() => {
            return fs.writeFile(filePath, fileContent);
        }).then(() => {
            const statuses = [];
            const statusCallback = function (path, status) {
                statuses.push({ path, status });
            };

            const opts = {
                flags: Status.OPT.INCLUDE_UNTRACKED +
                Status.OPT.RECURSE_UNTRACKED_DIRS
            };

            return Status.foreachExt(repo, opts, statusCallback).then(() => {
                assert.equal(statuses.length, 1);
                assert.equal(statuses[0].path, fileName);
                assert.equal(statuses[0].status, 128);
            });
        }).then(() => {
            return fs.rm(filePath);
        }).catch((e) => {
            return fs.rm(filePath).then(() => {
                return Promise.reject(e);
            });

        });
    });
});
