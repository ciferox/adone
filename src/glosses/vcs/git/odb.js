const native = adone.bind("git.node");
const {
    is,
    vcs: { git: {
        OdbObject // force load in case of indirect instantiation
    } }
} = adone;

const Odb = native.Odb;

Odb.STREAM = {
    RDONLY: 2,
    WRONLY: 4,
    RW: 6
};

Odb.open = adone.promise.promisifyAll(Odb.open);
Odb.prototype.read = adone.promise.promisifyAll(Odb.prototype.read);
Odb.prototype.write = adone.promise.promisifyAll(Odb.prototype.write);

const _read = Odb.prototype.read;

Odb.prototype.read = function (oid, callback) {
    return _read.call(this, oid).then((odbObject) => {
        if (is.function(callback)) {
            callback(null, odbObject);
        }

        return odbObject;
    }, callback);
};

export default Odb;
