const {
    std: { path },
    vcs: { git: { Config, Repository } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

const exec = adone.system.process.shell;

describe("Config", () => {
    const reposPath = local("repos/workdir");

    it("can get and set a global value", () => {
        let savedUserName;

        const finallyFn = () => exec(`git config --global user.name "${savedUserName}"`);

        return adone.system.process.execStdout("git", ["config", "--global", "user.name"]).then((userName) => {
            savedUserName = userName.trim();

            return exec(`git config --global user.name "${savedUserName}-test"`);
        }).then(() => {
            return Config.openDefault();
        }).then((config) => {
            return config.getString("user.name");
        }).then((userNameFromNodeGit) => {
            assert.equal(`${savedUserName}-test`, userNameFromNodeGit);
        }).then(finallyFn).catch((e) => {
            return finallyFn().then(() => {
                throw e;
            });
        });
    });

    it("will reject when getting value of non-existent config key", () => {
        // Test initially for finding source of a segfault. There was a problem
        // where getting an empty config value crashes nodegit.
        return Config.openDefault().then((config) => {
            return config.getString("user.fakevalue");
        }).catch((e) => {
            return true;
        });
    });

    it("can get and set a repo config value", () => {
        let savedUserName;

        const finallyFn = () => exec(`git config user.name "${savedUserName}"`, {
            cwd: reposPath
        });


        return adone.system.process.execStdout("git", ["config", "user.name"], {
            cwd: reposPath
        }).then((userName) => {
            savedUserName = userName.trim();

            return exec(`git config user.name "${savedUserName}-test"`, {
                cwd: reposPath
            });
        }).then(() => {
            return Repository.open(reposPath);
        }).then((repo) => {
            return repo.config();
        }).then((config) => {
            return config.getString("user.name");
        }).then((userNameFromNodeGit) => {
            assert.equal(`${savedUserName}-test`, userNameFromNodeGit);
        }).then(finallyFn).catch((e) => {
            return finallyFn().then(() => {
                throw e;
            });
        });
    });
});
