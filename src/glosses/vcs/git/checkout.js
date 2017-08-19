const native = adone.bind("git.node");

const {
    promise: { promisifyAll },
    vcs: { git: { CheckoutOptions, Utils: { normalizeOptions } } }
} = adone;

const Checkout = native.Checkout;

Checkout.NOTIFY = {
    NONE: 0,
    CONFLICT: 1,
    DIRTY: 2,
    UPDATED: 4,
    UNTRACKED: 8,
    IGNORED: 16,
    ALL: 65535
};

Checkout.STRATEGY = {
    NONE: 0,
    SAFE: 1,
    FORCE: 2,
    RECREATE_MISSING: 4,
    ALLOW_CONFLICTS: 16,
    REMOVE_UNTRACKED: 32,
    REMOVE_IGNORED: 64,
    UPDATE_ONLY: 128,
    DONT_UPDATE_INDEX: 256,
    NO_REFRESH: 512,
    SKIP_UNMERGED: 1024,
    USE_OURS: 2048,
    USE_THEIRS: 4096,
    DISABLE_PATHSPEC_MATCH: 8192,
    SKIP_LOCKED_DIRECTORIES: 262144,
    DONT_OVERWRITE_IGNORED: 524288,
    CONFLICT_STYLE_MERGE: 1048576,
    CONFLICT_STYLE_DIFF3: 2097152,
    DONT_REMOVE_EXISTING: 4194304,
    DONT_WRITE_INDEX: 8388608,
    UPDATE_SUBMODULES: 65536,
    UPDATE_SUBMODULES_IF_CHANGED: 131072
};

const asyncHead = promisifyAll(Checkout.head);
const asyncIndex = promisifyAll(Checkout.index);
const asyncTree = promisifyAll(Checkout.tree);

/**
* Patch head checkout to automatically coerce objects.
*
* @async
* @param {Repository} repo The repo to checkout head
* @param {CheckoutOptions} [options] Options for the checkout
* @return {Void} checkout complete
*/
Checkout.head = function (url, options) {
    options = normalizeOptions(options || {}, CheckoutOptions);

    return asyncHead.call(this, url, options);
};

/**
* Patch index checkout to automatically coerce objects.
*
* @async
* @param {Repository} repo The repo to checkout an index
* @param {Index} index The index to checkout
* @param {CheckoutOptions} [options] Options for the checkout
* @return {Void} checkout complete
*/
Checkout.index = function (repo, index, options) {
    options = normalizeOptions(options || {}, CheckoutOptions);

    return asyncIndex.call(this, repo, index, options);
};

/**
* Patch tree checkout to automatically coerce objects.
*
* @async
* @param {Repository} repo
* @param {String|Tree|Commit|Reference} treeish
* @param {CheckoutOptions} [options]
* @return {Void} checkout complete
*/
Checkout.tree = function (repo, treeish, options) {
    options = normalizeOptions(options || {}, CheckoutOptions);

    return asyncTree.call(this, repo, treeish, options);
};

export default Checkout;
