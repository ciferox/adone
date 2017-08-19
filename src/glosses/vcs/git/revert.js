const native = adone.bind("git.node");

const {
    is,
    promise: { promisifyAll },
    vcs: { git: { MergeOptions, Utils: { normalizeOptions } } }
} = adone;

const Revert = native.Revert;

Revert.revert = promisifyAll(Revert.revert);
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

// Inherit directly from the original Revert object.
Revert.revert.__proto__ = Revert;

// Ensure we're using the correct prototype.
Revert.revert.prototype = Revert.prototype;

// Assign the function as the root
export default Revert.revert;
// export default Revert;
