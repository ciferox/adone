const native = adone.bind("git.node");

const {
    promise: { promisifyAll },
    vcs: { git: { CherrypickOptions, MergeOptions, CheckoutOptions, Utils: { shallowClone, normalizeOptions } } }
} = adone;

const Cherrypick = native.Cherrypick;

Cherrypick.cherrypick = promisifyAll(Cherrypick.cherrypick);
Cherrypick.commit = promisifyAll(Cherrypick.commit);

const _cherrypick = Cherrypick.cherrypick;
const _commit = Cherrypick.commit;

/**
* Cherrypick a commit and, changing the index and working directory
*
* @async
* @param {Repository}         repo      The repo to checkout head
* @param {Commit}             commit    The commit to cherrypick
* @param {CherrypickOptions}  [options] Options for the cherrypick
* @return {int} 0 on success, -1 on failure
*/
Cherrypick.cherrypick = function (repo, commit, options) {
    let mergeOpts;
    let checkoutOpts;

    if (options) {
        options = shallowClone(options);
        mergeOpts = options.mergeOpts;
        checkoutOpts = options.checkoutOpts;
        delete options.mergeOpts;
        delete options.checkoutOpts;
    }

    options = normalizeOptions(options, CherrypickOptions);

    if (mergeOpts) {
        options.mergeOpts = normalizeOptions(mergeOpts, MergeOptions);
    }

    if (checkoutOpts) {
        options.checkoutOpts = normalizeOptions(checkoutOpts, CheckoutOptions);
    }

    return _cherrypick.call(this, repo, commit, options);
};

/**
* Cherrypicks the given commit against "our" commit, producing an index that
* reflects the result of the cherrypick. The index is not backed by a repo.
*
* @async
* @param {Repository}   repo              The repo to cherrypick commits
* @param {Commit}       cherrypick_commit The commit to cherrypick
* @param {Commit}       our_commit        The commit to revert against
* @param {int}          mainline          The parent of the revert commit (1 or
*                                         2) if it's a merge, 0 otherwise
* @param {MergeOptions} [merge_options]   Merge options for the cherrypick
* @return {int}   0 on success, -1 on failure
*/
Cherrypick.commit = function (repo, cherrypickCommit, ourCommit, mainline, mergeOptions) {
    mergeOptions = normalizeOptions(mergeOptions, MergeOptions);

    return _commit.call(this, repo, cherrypickCommit, ourCommit, mainline, mergeOptions);
};

// Inherit directly from the original Cherrypick object.
Cherrypick.cherrypick.__proto__ = Cherrypick;

// Ensure we're using the correct prototype.
Cherrypick.cherrypick.prototype = Cherrypick.prototype;

// Assign the function as the root
export default Cherrypick.cherrypick;
// export default Cherrypick;
