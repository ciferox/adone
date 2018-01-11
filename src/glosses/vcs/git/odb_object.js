const {
    vcs: { git: { native } }
} = adone;

const OdbObject = native.OdbObject;

OdbObject.prototype.dup = adone.promise.promisifyAll(OdbObject.prototype.dup);

OdbObject.prototype.toString = function (size) {
    size = size || this.size();

    return this.data().toBuffer(size).toString();
};

export default OdbObject;
