const {
    ipfs: { Repo },
    std: { os, path }
} = adone;

module.exports = (dir) => {
    const repoPath = dir || path.join(os.homedir(), ".jsipfs");

    return new Repo(repoPath);
};
