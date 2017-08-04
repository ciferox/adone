const native = adone.bind("git.node");

const {
    vcs: { git: { TreeEntry, Utils: { lookupWrapper } } }
} = adone;

const Blob = native.Blob;

Blob.createFromStream = adone.promise.promisifyAll(Blob.createFromStream);
Blob.createFromstreamCommit = adone.promise.promisifyAll(Blob.createFromstreamCommit);
Blob.prototype.dup = adone.promise.promisifyAll(Blob.prototype.dup);
Blob.lookup = adone.promise.promisifyAll(Blob.lookup);
Blob.lookupPrefix = adone.promise.promisifyAll(Blob.lookupPrefix);

/**
* Retrieves the blob pointed to by the oid
* @async
* @param {Repository} repo The repo that the blob lives in
* @param {String|Oid|Blob} id The blob to lookup
* @return {Blob}
*/
Blob.lookup = lookupWrapper(Blob);

/**
 * Retrieve the content of the Blob.
 *
 * @return {Buffer} Contents as a buffer.
 */
Blob.prototype.content = function () {
    return this.rawcontent().toBuffer(this.rawsize());
};

/**
 * Retrieve the Blob's type.
 *
 * @return {Number} The filemode of the blob.
 */
Blob.prototype.filemode = function () {
    const FileMode = TreeEntry.FILEMODE;

    return this.isBinary() ? FileMode.EXECUTABLE : FileMode.BLOB;
};

/**
 * Retrieve the Blob's content as String.
 *
 * @return {String} Contents as a string.
 */
Blob.prototype.toString = function () {
    return this.content().toString();
};

export default Blob;
