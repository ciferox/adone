const native = adone.bind("git.node");

const {
    vcs: { git: { Utils: { lookupWrapper } } }
} = adone;

const Tag = native.Tag;

Tag.annotationCreate = adone.promise.promisifyAll(Tag.annotationCreate);
Tag.create = adone.promise.promisifyAll(Tag.create);
Tag.createLightweight = adone.promise.promisifyAll(Tag.createLightweight);
Tag.delete = adone.promise.promisifyAll(Tag.delete);
Tag.prototype.dup = adone.promise.promisifyAll(Tag.prototype.dup);
Tag.list = adone.promise.promisifyAll(Tag.list);
Tag.lookup = adone.promise.promisifyAll(Tag.lookup);
Tag.lookupPrefix = adone.promise.promisifyAll(Tag.lookupPrefix);

/**
* Retrieves the tag pointed to by the oid
* @async
* @param {Repository} repo The repo that the tag lives in
* @param {String|Oid|Tag} id The tag to lookup
* @return {Tag}
*/
Tag.lookup = lookupWrapper(Tag);

export default Tag;
