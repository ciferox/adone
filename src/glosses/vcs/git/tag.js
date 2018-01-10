const native = adone.nativeAddon("git.node");

const {
    promise: { promisifyAll },
    vcs: { git: { Utils: { lookupWrapper } } }
} = adone;

const Tag = native.Tag;

Tag.annotationCreate = promisifyAll(Tag.annotationCreate);
Tag.create = promisifyAll(Tag.create);
Tag.createLightweight = promisifyAll(Tag.createLightweight);
Tag.delete = promisifyAll(Tag.delete);
Tag.prototype.dup = promisifyAll(Tag.prototype.dup);
Tag.list = promisifyAll(Tag.list);
Tag.lookup = promisifyAll(Tag.lookup);
Tag.lookupPrefix = promisifyAll(Tag.lookupPrefix);
Tag.prototype.peel = promisifyAll(Tag.prototype.peel);

/**
 * Retrieves the tag pointed to by the oid
 * @async
 * @param {Repository} repo The repo that the tag lives in
 * @param {String|Oid|Tag} id The tag to lookup
 * @return {Tag}
 */
Tag.lookup = lookupWrapper(Tag);

export default Tag;
