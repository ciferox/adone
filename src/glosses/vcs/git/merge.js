const {
    promise: { promisifyAll },
    vcs: { git: { native, MergeOptions, CheckoutOptions, Utils: { normalizeOptions } } }
} = adone;

const Merge = native.Merge;

Merge.ANALYSIS = {
    NONE: 0,
    NORMAL: 1,
    UP_TO_DATE: 2,
    FASTFORWARD: 4,
    UNBORN: 8
};

Merge.FILE_FAVOR = {
    NORMAL: 0,
    OURS: 1,
    THEIRS: 2,
    UNION: 3
};

Merge.FILE_FLAG = {
    FILE_DEFAULT: 0,
    FILE_STYLE_MERGE: 1,
    FILE_STYLE_DIFF3: 2,
    FILE_SIMPLIFY_ALNUM: 4,
    FILE_IGNORE_WHITESPACE: 8,
    FILE_IGNORE_WHITESPACE_CHANGE: 16,
    FILE_IGNORE_WHITESPACE_EOL: 32,
    FILE_DIFF_PATIENCE: 64,
    FILE_DIFF_MINIMAL: 128
};

Merge.FLAG = {
    FIND_RENAMES: 1,
    FAIL_ON_CONFLICT: 2,
    SKIP_REUC: 4,
    NO_RECURSIVE: 8
};

Merge.PREFERENCE = {
    NONE: 0,
    NO_FASTFORWARD: 1,
    FASTFORWARD_ONLY: 2
};

Merge.merge = promisifyAll(Merge.merge);
Merge.base = promisifyAll(Merge.base);
Merge.bases = promisifyAll(Merge.bases);
Merge.commits = promisifyAll(Merge.commits);
Merge.trees = promisifyAll(Merge.trees);

const _commits = Merge.commits;
const _merge = Merge.merge;

/**
 * Merge 2 commits together and create an new index that can
 * be used to create a merge commit.
 *
 * @param {Repository} repo Repository that contains the given commits
 * @param {Commit} ourCommit The commit that reflects the destination tree
 * @param {Commit} theirCommit The commit to merge into ourCommit
 * @param {MergeOptions} [options] The merge tree options (null for default)
 */
Merge.commits = function (repo, ourCommit, theirCommit, options) {
    options = normalizeOptions(options, MergeOptions);

    return Promise.all([
        repo.getCommit(ourCommit),
        repo.getCommit(theirCommit)
    ]).then(function (commits) {
        return _commits.call(this, repo, commits[0], commits[1], options);
    });
};

/**
 * Merge a commit into HEAD and writes the results to the working directory.
 *
 * @param {Repository} repo Repository that contains the given commits
 * @param {AnnotatedCommit} theirHead The annotated commit to merge into HEAD
 * @param {MergeOptions} [mergeOpts] The merge tree options (null for default)
 * @param {CheckoutOptions} [checkoutOpts] The checkout options
 *                                         (null for default)
 */
Merge.merge = function (repo, theirHead, mergeOpts, checkoutOpts) {
    mergeOpts = normalizeOptions(mergeOpts || {}, MergeOptions);
    checkoutOpts = normalizeOptions(checkoutOpts || {}, CheckoutOptions);

    // Even though git_merge takes an array of annotated_commits, it expects
    // exactly one to have been passed in or it will throw an error...  ¯\_(ツ)_/¯
    const theirHeads = [theirHead];

    return _merge.call(this, repo, theirHeads, theirHeads.length, mergeOpts, checkoutOpts);
};

// Inherit directly from the original Merge object.
Merge.merge.__proto__ = Merge;

// Ensure we're using the correct prototype.
Merge.merge.prototype = Merge.prototype;

// Assign the function as the root
export default Merge.merge;
// export default Merge;
