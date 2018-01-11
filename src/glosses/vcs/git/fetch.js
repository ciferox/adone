const {
    vcs: { git: { native } }
} = adone;

const Fetch = native.Fetch;

Fetch.PRUNE = {
    GIT_FETCH_PRUNE_UNSPECIFIED: 0,
    GIT_FETCH_PRUNE: 1,
    GIT_FETCH_NO_PRUNE: 2
};

export default Fetch;
