const native = adone.nativeAddon("git.node");

const {
    promise: { promisifyAll },
    vcs: { git: { TreeEntry, Utils: { lookupWrapper } } }
} = adone;

const Blob = native.Blob;

Blob.createFromBuffer = promisifyAll(Blob.createFromBuffer);
Blob.createFromDisk = promisifyAll(Blob.createFromDisk);
Blob.createFromStream = promisifyAll(Blob.createFromStream);
Blob.createFromstreamCommit = promisifyAll(Blob.createFromstreamCommit);
Blob.createFromWorkdir = promisifyAll(Blob.createFromWorkdir);
Blob.prototype.dup = promisifyAll(Blob.prototype.dup);
Blob.filteredContent = promisifyAll(Blob.filteredContent);
Blob.lookup = promisifyAll(Blob.lookup);
Blob.lookupPrefix = promisifyAll(Blob.lookupPrefix);

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
