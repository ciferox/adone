const native = adone.bind("git.node");

const {
    promise: { promisifyAll }
} = adone;

const Obj = native.Object;

Obj.TYPE = {
    ANY: -2,
    BAD: -1,
    EXT1: 0,
    COMMIT: 1,
    TREE: 2,
    BLOB: 3,
    TAG: 4,
    EXT2: 5,
    OFS_DELTA: 6,
    REF_DELTA: 7
};

Obj.prototype.dup = promisifyAll(Obj.prototype.dup);
Obj.lookup = promisifyAll(Obj.lookup);
Obj.prototype.lookupByPath = promisifyAll(Obj.prototype.lookupByPath);
Obj.lookupPrefix = promisifyAll(Obj.lookupPrefix);
Obj.prototype.peel = promisifyAll(Obj.prototype.peel);
Obj.prototype.shortId = promisifyAll(Obj.prototype.shortId);

/**
 * Is this object a blob?
 * @return {Boolean}
 */
Obj.prototype.isBlob = function () {
    return this.type() === Obj.TYPE.BLOB;
};

/**
 * Is this object a commit?
 * @return {Boolean}
 */
Obj.prototype.isCommit = function () {
    return this.type() === Obj.TYPE.COMMIT;
};

/**
 * Is this object a tag?
 * @return {Boolean}
 */
Obj.prototype.isTag = function () {
    return this.type() === Obj.TYPE.TAG;
};

/**
 * Is this object a tree?
 * @return {Boolean}
 */
Obj.prototype.isTree = function () {
    return this.type() === Obj.TYPE.TREE;
};

export default Obj;
