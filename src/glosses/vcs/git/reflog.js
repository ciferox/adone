const native = adone.bind("git.node");

const Reflog = native.Reflog;

Reflog.read = adone.promise.promisifyAll(Reflog.read);

export default Reflog;
