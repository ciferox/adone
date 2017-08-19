const native = adone.bind("git.node");

const {
    promise: { promisifyAll }
} = adone;

const Reflog = native.Reflog;

Reflog.read = promisifyAll(Reflog.read);
Reflog.prototype.write = promisifyAll(Reflog.prototype.write);

export default Reflog;
