const native = adone.bind("git.node");

const {
    promise: { promisifyAll }
} = adone;

const Buf = native.Buf;

Buf.prototype.grow = promisifyAll(Buf.prototype.grow);
Buf.prototype.set = promisifyAll(Buf.prototype.set);

export default Buf;
