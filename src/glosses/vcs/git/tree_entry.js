const native = adone.nativeAddon("git.node");

const {
    is,
    std: { path },
    // force load in case of indirect instantiation
    vcs: { git: { Object: Obj } }
} = adone;

const TreeEntry = native.TreeEntry;

TreeEntry.FILEMODE = {
    UNREADABLE: 0,
    TREE: 16384,
    BLOB: 33188,
    EXECUTABLE: 33261,
    LINK: 40960,
    COMMIT: 57344
};

TreeEntry.prototype.toObject = adone.promise.promisifyAll(TreeEntry.prototype.toObject);

/**
 * Retrieve the blob for this entry. Make sure to call `isBlob` first!
 * @async
 * @return {Blob}
 */
TreeEntry.prototype.getBlob = function (callback) {
    return this.parent.repo.getBlob(this.id()).then((blob) => {
        if (is.function(callback)) {
            callback(null, blob);
        }

        return blob;
    }, callback);
};

/**
 * Retrieve the tree for this entry. Make sure to call `isTree` first!
 * @async
 * @return {Tree}
 */
TreeEntry.prototype.getTree = function (callback) {
    const entry = this;

    return this.parent.repo.getTree(this.id()).then((tree) => {
        tree.entry = entry;

        if (is.function(callback)) {
            callback(null, tree);
        }

        return tree;
    }, callback);
};

/**
 * Is this TreeEntry a blob? Alias for `isFile`
 * @return {Boolean}
 */
TreeEntry.prototype.isBlob = function () {
    return this.isFile();
};

/**
 * Is this TreeEntry a directory? Alias for `isTree`
 * @return {Boolean}
 */
TreeEntry.prototype.isDirectory = function () {
    return this.isTree();
};

/**
 * Is this TreeEntry a blob? (i.e., a file)
 * @return {Boolean}
 */
TreeEntry.prototype.isFile = function () {
    return this.filemode() === TreeEntry.FILEMODE.BLOB ||
        this.filemode() === TreeEntry.FILEMODE.EXECUTABLE;
};

/**
 * Is this TreeEntry a submodule?
 * @return {Boolean}
 */
TreeEntry.prototype.isSubmodule = function () {
    return this.filemode() === TreeEntry.FILEMODE.COMMIT;
};

/**
 * Is this TreeEntry a tree? (i.e., a directory)
 * @return {Boolean}
 */
TreeEntry.prototype.isTree = function () {
    return this.filemode() === TreeEntry.FILEMODE.TREE;
};

/**
 * Retrieve the SHA for this TreeEntry. Alias for `sha`
 * @return {String}
 */
TreeEntry.prototype.oid = function () {
    return this.sha();
};

/**
 * Returns the path for this entry.
 * @return {String}
 */
TreeEntry.prototype.path = function (callback) {
    const dirtoparent = this.dirtoparent || "";
    return path.join(this.parent.path(), dirtoparent, this.name());
};

/**
 * Retrieve the SHA for this TreeEntry.
 * @return {String}
 */
TreeEntry.prototype.sha = function () {
    return this.id().toString();
};

/**
 * Alias for `path`
 */
TreeEntry.prototype.toString = function () {
    return this.path();
};

export default TreeEntry;
