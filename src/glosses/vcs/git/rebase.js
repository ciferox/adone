const native = adone.bind("git.node");

const {
    vcs: { git: { Checkout, RebaseOptions, CheckoutOptions, MergeOptions, Utils: { normalizeOptions, shallowClone } } }
} = adone;

const Rebase = native.Rebase;

Rebase.prototype.next = adone.promise.promisifyAll(Rebase.prototype.next);
const asyncInit = adone.promise.promisifyAll(Rebase.init);
const asyncOpen = adone.promise.promisifyAll(Rebase.open);

/**
 * Initializes a rebase
 * @async
 * @param {Repository} repo The repository to perform the rebase
 * @param {AnnotatedCommit} branch The terminal commit to rebase, or NULL to
 *                                 rebase the current branch
 * @param {AnnotatedCommit} upstream The commit to begin rebasing from, or NULL
 *                                   to rebase all reachable commits
 * @param {AnnotatedCommit} onto The branch to rebase onto, or NULL to rebase
 *                               onto the given upstream
 * @param {RebaseOptions} options Options to specify how rebase is performed,
 *                                or NULL
 * @param {Function} callback
 * @return {Remote}
 */

function defaultRebaseOptions(options, checkoutStrategy) {
    let checkoutOptions;
    let mergeOptions;

    if (options) {
        options = shallowClone(options);
        checkoutOptions = options.checkoutOptions;
        mergeOptions = options.mergeOptions;
        delete options.checkoutOptions;
        delete options.mergeOptions;

        options = normalizeOptions(options, RebaseOptions);
    } else {
        options = normalizeOptions({}, RebaseOptions);
        if (checkoutStrategy) {
            checkoutOptions = {
                checkoutStrategy
            };
        }
    }

    if (checkoutOptions) {
        options.checkoutOptions = normalizeOptions(
            checkoutOptions,
            CheckoutOptions
        );
    }

    if (mergeOptions) {
        options.mergeOptions = normalizeOptions(
            mergeOptions,
            MergeOptions
        );
    }

    return options;
}

Rebase.init = function (repository, branch, upstream, onto, options) {
    options = defaultRebaseOptions(
        options,
        Checkout.STRATEGY.FORCE
    );
    return asyncInit(repository, branch, upstream, onto, options);
};

/**
 * Opens an existing rebase that was previously started by either an invocation
 * of Rebase.open or by another client.
 * @async
 * @param {Repository} repo The repository that has a rebase in-progress
 * @param {RebaseOptions} options Options to specify how rebase is performed
 * @param {Function} callback
 * @return {Remote}
 */
Rebase.open = function (repository, options) {
    options = defaultRebaseOptions(
        options,
        Checkout.STRATEGY.SAFE
    );
    return asyncOpen(repository, options);
};

export default Rebase;
