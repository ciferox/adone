const native = adone.bind("git.node");
const {
    vcs: { git: { Branch, Utils: { lookupWrapper } } }
} = adone;

const Reference = native.Reference;

Reference.TYPE = {
    INVALID: 0,
    OID: 1,
    SYMBOLIC: 2,
    LISTALL: 3
};

Reference.NORMALIZE = {
    REF_FORMAT_NORMAL: 0,
    REF_FORMAT_ALLOW_ONELEVEL: 1,
    REF_FORMAT_REFSPEC_PATTERN: 2,
    REF_FORMAT_REFSPEC_SHORTHAND: 4
};

Reference.create = adone.promise.promisifyAll(Reference.create);
Reference.createMatching = adone.promise.promisifyAll(Reference.createMatching);
Reference.prototype.dup = adone.promise.promisifyAll(Reference.prototype.dup);
Reference.dwim = adone.promise.promisifyAll(Reference.dwim);
Reference.list = adone.promise.promisifyAll(Reference.list);
Reference.lookup = adone.promise.promisifyAll(Reference.lookup);
Reference.nameToId = adone.promise.promisifyAll(Reference.nameToId);
Reference.prototype.peel = adone.promise.promisifyAll(Reference.prototype.peel);
Reference.prototype.rename = adone.promise.promisifyAll(Reference.prototype.rename);
Reference.prototype.resolve = adone.promise.promisifyAll(Reference.prototype.resolve);
Reference.prototype.setTarget = adone.promise.promisifyAll(Reference.prototype.setTarget);
Reference.symbolicCreate = adone.promise.promisifyAll(Reference.symbolicCreate);
Reference.symbolicCreateMatching = adone.promise.promisifyAll(Reference.symbolicCreateMatching);
Reference.prototype.symbolicSetTarget = adone.promise.promisifyAll(Reference.prototype.symbolicSetTarget);

/**
* Retrieves the reference by it's short name
* @async
* @param {Repository} repo The repo that the reference lives in
* @param {String|Reference} id The reference to lookup
* @param {Function} callback
* @return {Reference}
*/
Reference.dwim = lookupWrapper(Reference, Reference.dwim);

/**
* Retrieves the reference pointed to by the oid
* @async
* @param {Repository} repo The repo that the reference lives in
* @param {String|Reference} id The reference to lookup
* @param {Function} callback
* @return {Reference}
*/
Reference.lookup = lookupWrapper(Reference);

/**
 * Returns true if this reference is not symbolic
 * @return {Boolean}
 */
Reference.prototype.isConcrete = function () {
    return this.type() === Reference.TYPE.OID;
};

/**
 * Returns if the ref is pointed at by HEAD
 * @return {bool}
 */
Reference.prototype.isHead = function () {
    return Branch.isHead(this);
};

/**
 * Returns true if this reference is symbolic
 * @return {Boolean}
 */
Reference.prototype.isSymbolic = function () {
    return this.type() === Reference.TYPE.SYMBOLIC;
};

/**
 * Returns true if this reference is valid
 * @return {Boolean}
 */
Reference.prototype.isValid = function () {
    return this.type() !== Reference.TYPE.INVALID;
};

/**
 * Returns the name of the reference.
 * @return {String}
 */
Reference.prototype.toString = function () {
    return this.name();
};

export default Reference;
