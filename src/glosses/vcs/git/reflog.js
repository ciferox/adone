const {
    promise: { promisifyAll },
    vcs: { git: { native } }
} = adone;

const Reflog = native.Reflog;

Reflog.read = promisifyAll(Reflog.read);
Reflog.prototype.write = promisifyAll(Reflog.prototype.write);

export default Reflog;
