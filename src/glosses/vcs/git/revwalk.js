const native = adone.nativeAddon("git.node");

const {
    promise: { promisifyAll },
    is
} = adone;

const Revwalk = native.Revwalk;

Revwalk.SORT = {
    NONE: 0,
    TOPOLOGICAL: 1,
    TIME: 2,
    REVERSE: 4
};

Revwalk.prototype.next = promisifyAll(Revwalk.prototype.next);
Revwalk.prototype.fastWalk = promisifyAll(Revwalk.prototype.fastWalk);
Revwalk.prototype.fileHistoryWalk = promisifyAll(Revwalk.prototype.fileHistoryWalk);

Object.defineProperty(Revwalk.prototype, "repo", {
    get() {
        return this.repository();
    },
    configurable: true
});

const _sorting = Revwalk.prototype.sorting;
/**
 * @typedef historyEntry
 * @type {Object}
 * @property {Commit} commit the commit for this entry
 * @property {Number} status the status of the file in the commit
 * @property {String} newName the new name that is provided when status is
 *                            renamed
 * @property {String} oldName the old name that is provided when status is
 *                            renamed
 */
const fileHistoryWalk = Revwalk.prototype.fileHistoryWalk;
/**
 * @param {String} filePath
 * @param {Number} max_count
 * @async
 * @return {Array<historyEntry>}
 */
Revwalk.prototype.fileHistoryWalk = fileHistoryWalk;

/**
 * Get a number of commits.
 *
 * @async
 * @param  {Number} count (default: 10)
 * @return {Array<Commit>}
 */
Revwalk.prototype.getCommits = function (count) {
    count = count || 10;
    const promises = [];
    const walker = this;

    const walkCommitsCount = (count) => {
        if (count === 0) {
            return;
        }

        return walker.next().then((oid) => {
            promises.push(walker.repo.getCommit(oid));
            return walkCommitsCount(count - 1);
        }).catch((error) => {
            if (error.errno !== adone.vcs.git.Error.CODE.ITEROVER) {
                throw error;
            }
        });
    };

    return walkCommitsCount(count).then(() => {
        return Promise.all(promises);
    });
};

/**
 * Walk the history grabbing commits until the checkFn called with the
 * current commit returns false.
 *
 * @async
 * @param  {Function} checkFn function returns false to stop walking
 * @return {Array}
 */
Revwalk.prototype.getCommitsUntil = function (checkFn) {
    const commits = [];
    const walker = this;

    const walkCommitsCb = () => {
        return walker.next().then((oid) => {
            return walker.repo.getCommit(oid).then((commit) => {
                commits.push(commit);
                if (checkFn(commit)) {
                    return walkCommitsCb();
                }
            });
        }).catch((error) => {
            if (error.errno !== adone.vcs.git.Error.CODE.ITEROVER) {
                throw error;
            }
        });
    };

    return walkCommitsCb().then(() => {
        return commits;
    });
};

/**
 * Set the sort order for the revwalk. This function takes variable arguments
 * like `revwalk.sorting(NodeGit.RevWalk.Topological, NodeGit.RevWalk.Reverse).`
 *
 * @param {Number} sort
 */
Revwalk.prototype.sorting = function () {
    let sort = 0;

    for (let i = 0; i < arguments.length; i++) {
        sort |= arguments[i];
    }

    _sorting.call(this, sort);
};

/**
 * Walk the history from the given oid. The callback is invoked for each commit;
 * When the walk is over, the callback is invoked with `(null, null)`.
 *
 * @param  {Oid} oid
 * @param  {Function} callback
 */
Revwalk.prototype.walk = function (oid, callback) {
    const revwalk = this;

    this.push(oid);

    const walk = async () => {
        let oid;
        try {
            oid = await revwalk.next();
        } catch (err) {
            return callback(err);
        } finally {
            if (!oid) {
                if (is.function(callback)) {
                    return callback();
                }

                return;
            }

            revwalk.repo.getCommit(oid).then((commit) => {
                if (is.function(callback)) {
                    callback(null, commit);
                }

                walk();
            });
        }
    };

    walk();
};

export default Revwalk;
