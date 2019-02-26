const {
    ipfs: { mfs: { core } }
} = adone;

module.exports = (self) => {
    return core({
        ipld: self._ipld,
        repo: self._repo,
        repoOwner: self._options.repoOwner
    });
}
