const {
    fs,
    std: { path },
    vcs: { git: { Reset, Repository, Signature, Checkout } }
} = adone;

const RepositorySetup = {
    addFileToIndex: function addFileToIndex(repository, fileName) {
        return repository.refreshIndex().then((index) => {
            return index.addByPath(fileName).then(() => {
                return index.write();
            }).then(() => {
                return index.writeTree();
            });
        });
    },

    commitFileToRepo: async function commitFileToRepo(repository, fileName, fileContent, parentCommit) {
        const repoWorkDir = repository.workdir();
        const signature = Signature.create("Foo bar", "foo@bar.com", 123456789, 60);

        const filePath = path.join(repoWorkDir, fileName);
        const parents = [];
        if (parentCommit) {
            parents.push(parentCommit);
        }

        // fse.ensure allows us to write files inside new folders
        try {
            await fs.mkdir(path.dirname(filePath));
        } catch (err) {
            //
        }
        await fs.writeFile(filePath, fileContent);
        const oid = await RepositorySetup.addFileToIndex(repository, fileName);
        const commitOid = await repository.createCommit("HEAD", signature, signature, "initial commit", oid, parents);
        return repository.getCommit(commitOid);
    },

    createRepository: async function createRepository(repoPath) {
        // Create a new repository in a clean directory
        await fs.rm(repoPath);
        try {
            await fs.mkdir(repoPath);
        } catch (err) {
            //
        }
        return Repository.init(repoPath, 0);
    },

    // Expects empty repo
    setupBranches: function setupBranches(repository, checkoutOurs) {
        const repoWorkDir = repository.workdir();

        const ourBranchName = "ours";
        const theirBranchName = "theirs";

        const baseFileName = "baseNewFile.txt";
        const ourFileName = "ourNewFile.txt";
        const theirFileName = "theirNewFile.txt";

        const baseFileContent = "How do you feel about Toll Roads?";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!";
        const theirFileContent = "I'm skeptical about Toll Roads";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        let initialCommit;
        let ourBranch;
        let theirBranch;

        const ret = {
            ourBranchName,
            theirBranchName,

            ourSignature,
            theirSignature,

            ourFileName,
            theirFileName,

            ourFileContent,
            theirFileContent
        };

        return Promise.all([
            fs.writeFile(path.join(repoWorkDir, baseFileName), baseFileContent),
            fs.writeFile(path.join(repoWorkDir, ourFileName), ourFileContent),
            fs.writeFile(path.join(repoWorkDir, theirFileName), theirFileContent)
        ]).then(() => {
            return RepositorySetup.addFileToIndex(repository, baseFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "b5cdc109d437c4541a13fb7509116b5f03d5039a");

            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            assert.equal(commitOid.toString(), "be03abdf0353d05924c53bebeb0e5bb129cda44a");

            return repository.getCommit(commitOid);
        }).then((commit) => {
            ret.initialCommit = initialCommit = commit;

            return Promise.all([
                repository.createBranch(ourBranchName, initialCommit),
                repository.createBranch(theirBranchName, initialCommit)
            ]);
        }).then((branches) => {
            assert(branches[0]);
            assert(branches[1]);

            ret.ourBranch = ourBranch = branches[0];
            ret.theirBranch = theirBranch = branches[1];

            return RepositorySetup.addFileToIndex(repository, ourFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "77867fc0bfeb3f80ab18a78c8d53aa3a06207047");

            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            return repository.getCommit(commitOid);
        }).then((commit) => {
            ret.ourCommit = commit;
            return Reset.default(repository, initialCommit, ourFileName);
        }).then(() => {
            return RepositorySetup.addFileToIndex(repository, theirFileName);
        }).then((oid) => {
            assert.equal(oid.toString(), "be5f0fd38a39a67135ad68921c93cd5c17fefb3d");

            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [initialCommit]);
        }).then((commitOid) => {
            return repository.getCommit(commitOid);
        }).then((commit) => {
            ret.theirCommit = commit;
            return Reset.default(repository, initialCommit, theirFileName);
        }).then(() => {
            return Promise.all([
                fs.rm(path.join(repoWorkDir, ourFileName)),
                fs.rm(path.join(repoWorkDir, theirFileName))
            ]);
        }).then(() => {
            if (checkoutOurs) {
                const opts = {
                    checkoutStrategy: Checkout.STRATEGY.FORCE
                };

                return repository.checkoutBranch(ourBranchName, opts);
            }
        }).then(() => {
            return ret;
        });
    }
};

export default RepositorySetup;
