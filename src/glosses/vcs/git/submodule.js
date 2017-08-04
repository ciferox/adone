const native = adone.bind("git.node");
const {
    vcs: { git: { SubmoduleUpdateOptions, Utils: { normalizeFetchOptions, normalizeOptions, shallowClone } } }
} = adone;

const Submodule = native.Submodule;

Submodule.IGNORE = {
    UNSPECIFIED: -1,
    NONE: 1,
    UNTRACKED: 2,
    DIRTY: 3,
    ALL: 4
};

Submodule.RECURSE = {
    NO: 0,
    YES: 1,
    ONDEMAND: 2
};

Submodule.STATUS = {
    IN_HEAD: 1,
    IN_INDEX: 2,
    IN_CONFIG: 4,
    IN_WD: 8,
    INDEX_ADDED: 16,
    INDEX_DELETED: 32,
    INDEX_MODIFIED: 64,
    WD_UNINITIALIZED: 128,
    WD_ADDED: 256,
    WD_DELETED: 512,
    WD_MODIFIED: 1024,
    WD_INDEX_MODIFIED: 2048,
    WD_WD_MODIFIED: 4096,
    WD_UNTRACKED: 8192
};

Submodule.UPDATE = {
    CHECKOUT: 1,
    REBASE: 2,
    MERGE: 3,
    NONE: 4,
    DEFAULT: 0
};

Submodule.prototype.addFinalize = adone.promise.promisifyAll(Submodule.prototype.addFinalize);
Submodule.addSetup = adone.promise.promisifyAll(Submodule.addSetup);
Submodule.prototype.addToIndex = adone.promise.promisifyAll(Submodule.prototype.addToIndex);
Submodule.foreach = adone.promise.promisifyAll(Submodule.foreach);
Submodule.prototype.init = adone.promise.promisifyAll(Submodule.prototype.init);
Submodule.prototype.location = adone.promise.promisifyAll(Submodule.prototype.location);
Submodule.lookup = adone.promise.promisifyAll(Submodule.lookup);
Submodule.prototype.open = adone.promise.promisifyAll(Submodule.prototype.open);
Submodule.prototype.repoInit = adone.promise.promisifyAll(Submodule.prototype.repoInit);
Submodule.resolveUrl = adone.promise.promisifyAll(Submodule.resolveUrl);
Submodule.setIgnore = adone.promise.promisifyAll(Submodule.setIgnore);
Submodule.setUpdate = adone.promise.promisifyAll(Submodule.setUpdate);
Submodule.setUrl = adone.promise.promisifyAll(Submodule.setUrl);
Submodule.status = adone.promise.promisifyAll(Submodule.status);
Submodule.prototype.sync = adone.promise.promisifyAll(Submodule.prototype.sync);
Submodule.prototype.update = adone.promise.promisifyAll(Submodule.prototype.update);

const _foreach = Submodule.foreach;
const _update = Submodule.prototype.update;

// Override Submodule.foreach to eliminate the need to pass null payload
Submodule.foreach = function (repo, callback) {
    return _foreach(repo, callback, null);
};

/**
 * Updates a submodule
 *
 * @async
 * @param {Number} init Setting this to 1 will initialize submodule
 *                      before updating
 * @param {SubmoduleUpdateOptions} options Submodule update settings
 * @return {Number} 0 on success, any non-zero return value from a callback
 */
Submodule.prototype.update = function (init, options) {
    const fetchOpts = normalizeFetchOptions(options && options.fetchOpts);

    if (options) {
        options = shallowClone(options);
        delete options.fetchOpts;
    }

    options = normalizeOptions(options, SubmoduleUpdateOptions);

    if (options) {
        options.fetchOpts = fetchOpts;
    }

    return _update.call(this, init, options);
};

export default Submodule;
