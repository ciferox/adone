const native = adone.bind("git.node");

const {
    is,
    promise: { promisifyAll },
    std: { events },
    vcs: { git: {
        Oid,
        Utils: { lookupWrapper } } }
} = adone;

const Commit = native.Commit;

Commit.prototype.amend = promisifyAll(Commit.prototype.amend);
Commit.create = promisifyAll(Commit.create);
Commit.createWithSignature = promisifyAll(Commit.createWithSignature);
Commit.prototype.dup = promisifyAll(Commit.prototype.dup);
Commit.prototype.headerField = promisifyAll(Commit.prototype.headerField);
Commit.lookup = promisifyAll(Commit.lookup);
Commit.lookupPrefix = promisifyAll(Commit.lookupPrefix);
Commit.prototype.nthGenAncestor = promisifyAll(Commit.prototype.nthGenAncestor);
Commit.prototype.parent = promisifyAll(Commit.prototype.parent);


const _amend = Commit.prototype.amend;
/**
 * Retrieves the commit pointed to by the oid
 * @async
 * @param {Repository} repo The repo that the commit lives in
 * @param {String|Oid|Commit} id The commit to lookup
 * @return {Commit}
 */
Commit.lookup = lookupWrapper(Commit);

/**
 * Amend a commit
 * @async
 * @param {String} update_ref
 * @param {Signature} author
 * @param {Signature} committer
 * @param {String} message_encoding
 * @param {String} message
 * @param {Tree|Oid} tree
 * @param {Oid} callback
 */
Commit.prototype.amend = function (updateRef, author, committer, messageEncoding, message, tree, callback) {
    const repo = this.repo;
    const _this = this;
    let treePromise;

    if (tree instanceof Oid) {
        treePromise = repo.getTree(tree);
    } else {
        treePromise = Promise.resolve(tree);
    }

    return treePromise.then((treeObject) => {
        return _amend.call(_this, updateRef, author, committer, messageEncoding, message, treeObject);
    });
};

/**
 * Retrieve the commit time as a Date object.
 * @return {Date}
 */
Commit.prototype.date = function () {
    return new Date(this.timeMs());
};

/**
 * Generate an array of diff trees showing changes between this commit
 * and its parent(s).
 *
 * @async
 * @param {Function} callback
 * @return {Array<Diff>} an array of diffs
 */
Commit.prototype.getDiff = function (callback) {
    return this.getDiffWithOptions(null, callback);
};

/**
 * Generate an array of diff trees showing changes between this commit
 * and its parent(s).
 *
 * @async
 * @param {Object} options
 * @param {Function} callback
 * @return {Array<Diff>} an array of diffs
 */
Commit.prototype.getDiffWithOptions = function (options, callback) {
    const commit = this;

    return commit.getTree().then((thisTree) => {
        return commit.getParents().then((parents) => {
            let diffs;
            if (parents.length) {
                diffs = parents.map((parent) => {
                    return parent.getTree().then((parentTree) => {
                        return thisTree.diffWithOptions(parentTree, options);
                    });
                });
            } else {
                diffs = [thisTree.diffWithOptions(null, options)];
            }

            return Promise.all(diffs);
        });
    }).then((diffs) => {
        if (is.function(callback)) {
            callback(null, diffs);
        }

        return diffs;
    }, callback);
};

/**
 * Retrieve the entry represented by path for this commit.
 * Path must be relative to repository root.
 *
 * @async
 * @param {String} path
 * @return {TreeEntry}
 */
Commit.prototype.getEntry = function (path, callback) {
    return this.getTree().then((tree) => {
        return tree.getEntry(path).then((entry) => {
            if (is.function(callback)) {
                callback(null, entry);
            }

            return entry;
        });
    }, callback);
};

/**
 * Retrieve the commit's parents as commit objects.
 *
 * @async
 * @param {number} limit Optional amount of parents to return.
 * @param {Function} callback
 * @return {Array<Commit>} array of commits
 */
Commit.prototype.getParents = function (limit, callback) {
    const parents = [];

    // Shift arguments.
    if (is.function(limit)) {
        callback = limit;
    }

    // If no limit was set, default to the maximum parents.
    limit = is.number(limit) ? limit : this.parentcount();
    limit = Math.min(limit, this.parentcount());

    for (let i = 0; i < limit; i++) {
        const oid = this.parentId(i);
        const parent = this.repo.getCommit(oid);

        parents.push(parent);
    }

    // Wait for all parents to complete, before returning.
    return Promise.all(parents).then((parents) => {
        if (is.function(callback)) {
            callback(null, parents);
        }

        return parents;
    }, callback);
};

/**
 * Get the tree associated with this commit.
 *
 * @async
 * @return {Tree}
 */
Commit.prototype.getTree = function (callback) {
    return this.repo.getTree(this.treeId(), callback);
};

/**
 * Walk the history from this commit backwards.
 *
 * An EventEmitter is returned that will emit a "commit" event for each
 * commit in the history, and one "end" event when the walk is completed.
 * Don't forget to call `start()` on the returned event.
 *
 * @fires EventEmitter#commit Commit
 * @fires EventEmitter#end Array<Commit>
 * @fires EventEmitter#error Error
 *
 * @return {EventEmitter}
 * @start start()
 */
Commit.prototype.history = function () {
    const event = new events.EventEmitter();
    const oid = this.id();
    const revwalk = this.repo.createRevWalk();

    revwalk.sorting.apply(revwalk, arguments);

    const commits = [];

    event.start = function () {
        revwalk.walk(oid, function commitRevWalk(error, commit) {
            if (error) {
                if (error.errno === adone.vcs.git.Error.CODE.ITEROVER) {
                    event.emit("end", commits);
                    return;
                }
                return event.emit("error", error);

            }

            event.emit("commit", commit);
            commits.push(commit);
        });
    };

    return event;
};

/**
 * Retrieve the commit's parent shas.
 *
 * @return {Array<Oid>} array of oids
 */
Commit.prototype.parents = function () {
    const result = [];

    for (let i = 0; i < this.parentcount(); i++) {
        result.push(this.parentId(i));
    }

    return result;
};

/**
 * Retrieve the SHA.
 * @return {String}
 */
Commit.prototype.sha = function () {
    return this.id().toString();
};

/**
 * Retrieve the commit time as a unix timestamp.
 * @return {Number}
 */
Commit.prototype.timeMs = function () {
    return this.time() * 1000;
};

/**
 * The sha of this commit
 * @return {String}
 */
Commit.prototype.toString = function () {
    return this.sha();
};

export default Commit;
