const { Repo } = adone.ipfs;

module.exports = (dir) => {
    const repoPath = dir || "ipfs";
    return new Repo(repoPath);
};
