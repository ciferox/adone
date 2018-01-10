const native = adone.nativeAddon("git.node");

const {
    is,
    promise: { promisifyAll },
    vcs: { git: { MergeOptions, Utils: { normalizeOptions, shallowClone } } }
} = adone;

const Revert = native.Revert;

const asyncRevert = promisifyAll(Revert.revert);
const asyncCommit = promisifyAll(Revert.commit);

/**
 * Reverts the given commit against the given "our" commit, producing an index
 * that reflects the result of the revert.
 *
 * @async
 * @param {Repository} repo the repository that contains the given commits.
 * @param {Commit} revert_commit the commit to revert
 * @param {Commit} our_commit the commit to revert against (e.g. HEAD)
 * @param {Number} mainline the parent of the revert commit, if it is a merge
 * @param {MergeOptions} merge_options the merge options (or null for defaults)
 *
 * @return {Index} the index result
 */
Revert.commit = function (repo, revertCommit, ourCommit, mainline, mergeOptions, callback) {
    mergeOptions = normalizeOptions(mergeOptions, MergeOptions);

    return asyncCommit.call(this, repo, revertCommit, ourCommit, mainline, mergeOptions).then((result) => {
        if (is.function(callback)) {
            callback(null, result);
        }

        return result;
    }, callback);
};

/**
 * Reverts the given commit, producing changes in the index and
 * working directory.
 * 
 * @async
 * @param {Repository} repo the repository to perform the revert in
 * @param {Commit} commit the commit to revert
 * @param {RevertOptions} revert_options the revert options
 *                                       (or null for defaults)
 */
Revert.revert = function (repo, commit, revertOpts) {
    let mergeOpts;
    let checkoutOpts;

    if (revertOpts) {
        revertOpts = shallowClone(revertOpts);
        mergeOpts = revertOpts.mergeOpts;
        checkoutOpts = revertOpts.checkoutOpts;
        delete revertOpts.mergeOpts;
        delete revertOpts.checkoutOpts;
    }

    revertOpts = normalizeOptions(revertOpts, adone.vcs.git.RevertOptions);

    if (revertOpts) {
        revertOpts.mergeOpts = normalizeOptions(mergeOpts, adone.vcs.git.MergeOptions);
    }

    if (checkoutOpts) {
        revertOpts.checkoutOpts = normalizeOptions(checkoutOpts, adone.vcs.git.CheckoutOptions);
    }

    return asyncRevert.call(this, repo, commit, revertOpts);
};

// Inherit directly from the original Revert object.
// Revert.revert.__proto__ = Revert;

// // Ensure we're using the correct prototype.
// Revert.revert.prototype = Revert.prototype;

// Assign the function as the root
export default Revert;
