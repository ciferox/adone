const {
    std: { path },
    vcs: { git: { Repository, Signature } },
    system: { process: { shell, execStdout } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

// const garbageCollect = require("../utils/garbage_collect.js");

describe("Signature", () => {
    const reposPath = local("repos/workdir");

    const name = "Bob Gnarley";
    const email = "gnarlee@bob.net";
    const arbitraryDate = 123456789;
    const timezoneOffset = 60;

    it("can be created at an arbitrary time", () => {
        const create = Signature.create;
        const signature = create(name, email, arbitraryDate, timezoneOffset);

        assert.equal(signature.name(), name);
        assert.equal(signature.email(), email);
        assert.equal(signature.when().time(), arbitraryDate);
        assert.equal(signature.when().offset(), 60);
    });

    it("can be created now", () => {
        const signature = Signature.now(name, email);
        const now = new Date();
        const when = signature.when();
        const diff = Math.abs(when.time() - now / 1000);

        assert.equal(signature.name(), name);
        assert.equal(signature.email(), email);
        assert(diff <= 1);

        // libgit2 does its timezone offsets backwards from javascript
        assert.equal(when.offset(), -now.getTimezoneOffset());
    });

    it("can get a default signature when no user name is set", (done) => {
        let savedUserName;
        let savedUserEmail;

        const cleanUp = function () {
            return shell(`git config --global user.name "${savedUserName}"`).then(() => {
                shell(`git config --global user.email "${savedUserEmail}"`);
            });
        };

        return execStdout("git", ["config", "--global", "user.name"]).then((userName) => {
            savedUserName = userName.trim();

            return execStdout("git", ["config", "--global", "user.email"]);
        }).then((userEmail) => {
            savedUserEmail = userEmail.trim();

            return shell("git config --global --unset user.name");
        }).then(() => {
            return shell("git config --global --unset user.email");
        }).then(() => {
            return Repository.open(reposPath);
        }).then((repo) => {
            const sig = repo.defaultSignature();
            assert.equal(sig.name(), "unknown");
            assert.equal(sig.email(), "unknown@example.com");
        }).then(cleanUp).then(done).catch((e) => {
            cleanUp().then(() => {
                done(e);
                return Promise.reject(e);
            });
        });
    });

    it.skip("duplicates time", () => {
        garbageCollect();
        const Time = NodeGit.Time;
        const startSelfFreeingCount = Time.getSelfFreeingInstanceCount();
        const startNonSelfFreeingCount = Time.getNonSelfFreeingConstructedCount();
        let time = Signature.now(name, email).when();

        garbageCollect();
        let endSelfFreeingCount = Time.getSelfFreeingInstanceCount();
        const endNonSelfFreeingCount = Time.getNonSelfFreeingConstructedCount();
        // we should get one duplicated, self-freeing time
        assert.equal(startSelfFreeingCount + 1, endSelfFreeingCount);
        assert.equal(startNonSelfFreeingCount, endNonSelfFreeingCount);

        time = null;
        garbageCollect();
        endSelfFreeingCount = Time.getSelfFreeingInstanceCount();
        // the self-freeing time should get freed
        assert.equal(startSelfFreeingCount, endSelfFreeingCount);
    });
});
