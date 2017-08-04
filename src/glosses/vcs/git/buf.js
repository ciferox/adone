const native = adone.bind("git.node");

const Buf = native.Buf;

Buf.prototype.grow = adone.promise.promisifyAll(Buf.prototype.grow);
Buf.prototype.set = adone.promise.promisifyAll(Buf.prototype.set);

export default Buf;
