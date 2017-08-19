const native = adone.bind("git.node");
const {
    is,
    promise: { promisifyAll },
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

Odb.open = promisifyAll(Odb.open);
Odb.prototype.read = promisifyAll(Odb.prototype.read);
Odb.prototype.write = promisifyAll(Odb.prototype.write);

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
