const native = adone.bind("git.node");

const {
    promise: { promisifyAll },
    vcs: { git: { CloneOptions, Repository, Utils: { shallowClone, normalizeFetchOptions, normalizeOptions } } }
} = adone;

const Clone = native.Clone;

Clone.LOCAL = {
    AUTO: 0,
    LOCAL: 1,
    NO_LOCAL: 2,
    NO_LINKS: 3
};

const asyncClone = promisifyAll(Clone.clone);

/**
 * Patch repository cloning to automatically coerce objects.
 *
 * @async
 * @param {String} url url of the repository
 * @param {String} local_path local path to store repository
 * @param {CloneOptions} [options]
 * @return {Repository} repo
 */
Clone.clone = function (url, localPath, options) {
    const fetchOpts = normalizeFetchOptions(options && options.fetchOpts);

    if (options) {
        options = shallowClone(options);
        delete options.fetchOpts;
    }

    options = normalizeOptions(options, CloneOptions);

    if (options) {
        options.fetchOpts = fetchOpts;
    }

    // This is required to clean up after the clone to avoid file locking
    // issues in Windows and potentially other issues we don't know about.
    const freeRepository = function (repository) {
        repository.free();
    };

    // We want to provide a valid repository object, so reopen the repository
    // after clone and cleanup.
    const openRepository = function () {
        return Repository.open(localPath);
    };

    return asyncClone.call(this, url, localPath, options).then(freeRepository).then(openRepository);
};

// Inherit directly from the original Clone object.
Clone.clone.__proto__ = Clone;

// Ensure we're using the correct prototype.
Clone.clone.prototype = Clone.prototype;

// Assign the function as the root
export default Clone.clone;
// export default Clone;
