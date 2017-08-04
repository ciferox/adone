const {
    fs,
    std: { path },
    vcs: { git: { Repository, Stash } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Stash", () => {
    const reposPath = local("repos/workdir");

    before(function () {
        const test = this;
        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;
        });
    });

    it("gets no stashes on clean working directory", function () {
        const stashes = [];
        const stashCb = function (index, message, oid) {
            stashes.push({ index, message, oid });
        };

        return Stash.foreach(this.repository, stashCb).then(() => {
            assert.equal(stashes.length, 0);
        });
    });

    const saveDropStash = (repo, stashMessage) => {
        const fileName = "README.md";
        const fileContent = "Cha-cha-cha-chaaaaaangessssss";
        const filePath = path.join(repo.workdir(), fileName);
        let oldContent;
        let stashes = [];
        let stashOid;

        return fs.readFile(filePath).then((content) => {
            oldContent = content;
            return fs.writeFile(filePath, fileContent);
        }).then(() => {
            return Stash.save(repo, repo.defaultSignature(), stashMessage, 0);
        }).then((oid) => {
            stashOid = oid;
            const stashCb = function (index, message, oid) {
                stashes.push({ index, message, oid });
            };

            return Stash.foreach(repo, stashCb);
        }).then(() => {
            assert.equal(stashes.length, 1);
            assert.equal(stashes[0].index, 0);
            assert.equal(stashes[0].message, `On master: ${stashMessage}`);
            assert.equal(stashes[0].oid.toString(), stashOid.toString());

            return Stash.drop(repo, 0);
        }).then(() => {
            stashes = [];
            const stashCb = function (index, message, oid) {
                stashes.push({ index, message, oid });
            };

            return Stash.foreach(repo, stashCb);
        }).then(() => {
            assert.equal(stashes.length, 0);
        }).catch((e) => {
            return fs.writeFile(filePath, oldContent).then(() => {
                return Promise.reject(e);
            });
        });
    };

    it("can save and drop a stash", function () {
        return saveDropStash(this.repository, "stash test");
    });

    it.skip("can save a stash with no message and drop it", function () {
        return saveDropStash(this.repository, null);
    });

    it("can save and pop a stash", function () {
        const fileNameA = "README.md";
        const fileNameB = "install.js";
        let oldContentA;
        let oldContentB;
        const fileContent = "Cha-cha-cha-chaaaaaangessssss";
        const repo = this.repository;
        const filePathA = path.join(repo.workdir(), fileNameA);
        const filePathB = path.join(repo.workdir(), fileNameB);
        const stashMessage = "stash test";

        return fs.readFile(filePathA, { encoding: "utf8" }).then((content) => {
            oldContentA = content;
            return fs.writeFile(filePathA, fileContent);
        }).then(() => {
            return fs.readFile(filePathB, { encoding: "utf8" });
        }).then((content) => {
            oldContentB = content;
            return fs.writeFile(filePathB, fileContent);
        }).then(() => {
            return Stash.save(repo, repo.defaultSignature(), stashMessage, 0);
        }).then(() => {
            return fs.readFile(filePathA, { encoding: "utf8" });
        }).then((content) => {
            assert.equal(oldContentA, content);
            return fs.readFile(filePathB, { encoding: "utf8" });
        }).then((content) => {
            assert.equal(oldContentB, content);
            return Stash.pop(repo, 0);
        }).then(() => {
            return fs.readFile(filePathA, { encoding: "utf8" });
        }).then((content) => {
            assert.equal(fileContent, content);
            return fs.readFile(filePathB, { encoding: "utf8" });
        }).then((content) => {
            assert.equal(fileContent, content);
        });
    });

    it("can save a stash, change files, and fail to pop stash", function () {
        const fileName = "README.md";
        const fileContent = "Cha-cha-cha-chaaaaaangessssss";
        const fileContent2 = "Somewhere over the repo, changes were made.";
        const repo = this.repository;
        const filePath = path.join(repo.workdir(), fileName);
        let oldContent;
        const stashMessage = "stash test";

        return fs.readFile(filePath).then((content) => {
            oldContent = content;
            return fs.writeFile(filePath, fileContent);
        }).then(() => {
            return Stash.save(repo, repo.defaultSignature(), stashMessage, 0);
        }).then(() => {
            return fs.writeFile(filePath, fileContent2);
        }).then(() => {
            return Stash.pop(repo, 0);
        }).catch((reason) => {
            if (reason.message !== "1 conflict prevents checkout") {
                throw reason;
            } else {
                return Promise.resolve();
            }
        });
    });

    it("can save, apply, then drop the stash", function () {
        const fileName = "README.md";
        const fileContent = "Cha-cha-cha-chaaaaaangessssss";
        const repo = this.repository;
        const filePath = path.join(repo.workdir(), fileName);
        let oldContent;
        const stashMessage = "stash test";

        return fs.readFile(filePath).then((content) => {
            oldContent = content;
            return fs.writeFile(filePath, fileContent);
        }).then(() => {
            return Stash.save(repo, repo.defaultSignature(), stashMessage, 0);
        }).then(() => {
            return Stash.apply(repo, 0);
        }).then(() => {
            return Stash.drop(repo, 0);
        }, () => {
            throw new Error("Unable to drop stash after apply.");
        }).then(() => {
            return Stash.drop(repo, 0);
        }).catch((reason) => {
            if (reason.message !== "reference 'refs/stash' not found") {
                Promise.reject();
            }
        });
    });

    it("can save multiple stashes and pop an arbitrary stash", function () {
        const fileName = "README.md";
        const fileContentA = "Hi. It's me. I'm the dog. My name is the dog.";
        const fileContentB = "Everyone likes me. I'm cute.";
        const fileContentC = "I think I will bark at nothing now. Ba. Ba. Baba Baba.";
        const repo = this.repository;

        const filePath = path.join(repo.workdir(), fileName);
        let oldContent;
        const stashMessageA = "stash test A";
        const stashMessageB = "stash test B";
        const stashMessageC = "stash test C";

        const writeAndStash = (path, content, message) => fs.writeFile(path, content).then(() => Stash.save(repo, repo.defaultSignature(), message, 0));

        return fs.readFile(filePath, { encoding: "utf8" }).then((content) => {
            oldContent = content;
            return writeAndStash(filePath, fileContentA, stashMessageA);
        }).then(() => {
            return writeAndStash(filePath, fileContentB, stashMessageB);
        }).then(() => {
            return writeAndStash(filePath, fileContentC, stashMessageC);
        }).then(() => {
            return fs.readFile(filePath, { encoding: "utf8" });
        }).then((content) => {
            assert.equal(oldContent, content);
            return Stash.pop(repo, 1);
        }).then(() => {
            return fs.readFile(filePath, { encoding: "utf8" });
        }).then((content) => {
            assert.equal(fileContentB, content);
        });
    });
});
