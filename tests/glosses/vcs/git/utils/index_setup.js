import RepoUtils from "./repository_setup";
const {
    fs,
    std: { path },
    vcs: { git: { Checkout, CheckoutOptions, Signature } }
} = adone;

const IndexSetup = {
    createConflict: function createConflict(repository, _ourBranchName, _theirBranchName, _fileName) {
        const fileName = _fileName || "everyonesFile.txt";

        const ourBranchName = _ourBranchName || "ours";
        const theirBranchName = _theirBranchName || "theirs";

        const baseFileContent = "How do you feel about Toll Roads?\n";
        const ourFileContent = "I like Toll Roads. I have an EZ-Pass!\n";
        const theirFileContent = "I'm skeptical about Toll Roads\n";

        const ourSignature = Signature.create("Ron Paul", "RonPaul@TollRoadsRBest.info", 123456789, 60);
        const theirSignature = Signature.create("Greg Abbott", "Gregggg@IllTollYourFace.us", 123456789, 60);

        let ourCommit;
        let ourBranch;
        let theirBranch;

        return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            return repository.createCommit("HEAD", ourSignature, ourSignature, "initial commit", oid, []);
        }).then((commitOid) => {
            return repository.getCommit(commitOid).then((commit) => {
                ourCommit = commit;
            }).then(() => {
                return repository.createBranch(ourBranchName, commitOid).then((branch) => {
                    ourBranch = branch;
                    return repository.createBranch(theirBranchName, commitOid);
                });
            });
        }).then((branch) => {
            theirBranch = branch;
            return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent + theirFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            return repository.createCommit(theirBranch.name(), theirSignature, theirSignature, "they made a commit", oid, [ourCommit]);
        }).then((commitOid) => {
            return fs.writeFile(path.join(repository.workdir(), fileName), baseFileContent + ourFileContent);
        }).then(() => {
            return RepoUtils.addFileToIndex(repository, fileName);
        }).then((oid) => {
            return repository.createCommit(ourBranch.name(), ourSignature, ourSignature, "we made a commit", oid, [ourCommit]);
        }).then(() => {
            return repository.checkoutBranch(ourBranch, new CheckoutOptions());
        }).then(() => {
            return repository.mergeBranches(ourBranchName, theirBranchName);
        }).catch((index) => {
            return Checkout.index(repository, index).then(() => {
                return index;
            });
        });
    }
};

export default IndexSetup;
