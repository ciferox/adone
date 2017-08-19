const native = adone.bind("git.node");

const {
    promise: { promisifyAll },
    vcs: { git: { CheckoutOptions, StashApplyOptions, Utils: { normalizeOptions, shallowClone } } }
} = adone;

const Stash = native.Stash;

Stash.APPLY_FLAGS = {
    APPLY_DEFAULT: 0,
    APPLY_REINSTATE_INDEX: 1
};

Stash.APPLY_PROGRESS = {
    NONE: 0,
    LOADING_STASH: 1,
    ANALYZE_INDEX: 2,
    ANALYZE_MODIFIED: 3,
    ANALYZE_UNTRACKED: 4,
    CHECKOUT_UNTRACKED: 5,
    CHECKOUT_MODIFIED: 6,
    DONE: 7
};

Stash.FLAGS = {
    DEFAULT: 0,
    KEEP_INDEX: 1,
    INCLUDE_UNTRACKED: 2,
    INCLUDE_IGNORED: 4
};

Stash.apply = promisifyAll(Stash.apply);
Stash.drop = promisifyAll(Stash.drop);
Stash.foreach = promisifyAll(Stash.foreach);
Stash.pop = promisifyAll(Stash.pop);
Stash.save = promisifyAll(Stash.save);

const _apply = Stash.apply;
const _foreach = Stash.foreach;
const _pop = Stash.pop;

Stash.apply = function (repo, index, options) {
    let checkoutOptions;

    if (options) {
        options = shallowClone(options);
        checkoutOptions = options.checkoutOptions;
        delete options.checkoutOptions;
    } else {
        options = {};
    }

    options = normalizeOptions(options, StashApplyOptions);

    if (checkoutOptions) {
        options.checkoutOptions =
            normalizeOptions(checkoutOptions, CheckoutOptions);
    }

    return _apply(repo, index, options);
};

// Override Stash.foreach to eliminate the need to pass null payload
Stash.foreach = function (repo, callback) {
    const wrappedCallback = (index, message, oid) => {
        // We need to copy the OID since libgit2 types are getting cleaned up
        // incorrectly right now in callbacks

        return callback(index, message, oid.copy());
    };

    return _foreach(repo, wrappedCallback, null);
};

Stash.pop = function (repo, index, options) {
    let checkoutOptions;

    if (options) {
        options = shallowClone(options);
        checkoutOptions = options.checkoutOptions;
        delete options.checkoutOptions;
    } else {
        options = {};
    }

    options = normalizeOptions(options, StashApplyOptions);

    if (checkoutOptions) {
        options.checkoutOptions =
            normalizeOptions(checkoutOptions, CheckoutOptions);
    }

    return _pop(repo, index, options);
};

export default Stash;
