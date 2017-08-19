const native = adone.bind("git.node");

const {
    promise: { promisifyAll },
    vcs: { git: { CheckoutOptions, Utils: { normalizeOptions } } }
} = adone;

const Reset = native.Reset;

Reset.TYPE = {
    SOFT: 1,
    MIXED: 2,
    HARD: 3
};

Reset.reset = promisifyAll(Reset.reset);
Reset.default = promisifyAll(Reset.default);
Reset.fromAnnotated = promisifyAll(Reset.fromAnnotated);

const _default = Reset.default;
const _reset = Reset.reset;
const _fromAnnotated = Reset.fromAnnotated;

/**
 * Look up a refs's commit.
 *
 * @async
 * @param {Repository} repo Repository where to perform the reset operation.
 * @param {Commit|Tag} target The committish which content will be used to reset
 *                        the content of the index.
 * @param {Strarray} pathspecs List of pathspecs to operate on.
 *
 * @return {Number} 0 on success or an error code
 */
Reset.default = function (repo, target, pathspecs) {
    return _default.call(this, repo, target, pathspecs);
};

/**
 * Look up a refs's commit.
 *
 * @async
 * @param {Repository} repo Repository where to perform the reset operation.
 *
 * @param {Commit|Tag} target Committish to which the Head should be moved to.
 *                        This object must belong to the given `repo` and can
 *                        either be a git_commit or a git_tag. When a git_tag is
 *                        being passed, it should be dereferencable to a
 *                        git_commit which oid will be used as the target of the
 *                        branch.
 * @param {Number} resetType Kind of reset operation to perform.
 *
 * @param {CheckoutOptions} opts Checkout options to be used for a HARD reset.
 *                               The checkout_strategy field will be overridden
 *                               (based on reset_type). This parameter can be
 *                               used to propagate notify and progress
 *                               callbacks.
 *
 * @param {String|Ref} name Ref name, e.g. "master", "refs/heads/master"
 *                          or Branch Ref
 *
 * @return {Number} 0 on success or an error code
 */
Reset.reset = function (repo, target, resetType, opts) {
    opts = normalizeOptions(opts, CheckoutOptions);

    return _reset.call(this, repo, target, resetType, opts);
};

/**
 * Sets the current head to the specified commit oid and optionally
 * resets the index and working tree to match.
 * 
 * This behaves like reset but takes an annotated commit, which lets
 * you specify which extended sha syntax string was specified by a
 * user, allowing for more exact reflog messages.
 * 
 * See the documentation for reset.
 * 
 * @async
 * @param {Repository} repo
 * @param {AnnotatedCommit} target
 * @param {Number} resetType
 * @param {CheckoutOptions} opts
 */
Reset.fromAnnotated = function (repo, target, resetType, opts) {
    opts = normalizeOptions(opts, CheckoutOptions);

    return _fromAnnotated.call(this, repo, target, resetType, opts);
};

// Inherit directly from the original Reset object.
Reset.reset.__proto__ = Reset;

// Ensure we're using the correct prototype.
Reset.reset.prototype = Reset.prototype;

// Assign the function as the root
export default Reset.reset;
// export default Reset;
