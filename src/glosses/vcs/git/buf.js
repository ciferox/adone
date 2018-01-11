const {
    promise: { promisifyAll },
    vcs: { git: { native } }
} = adone;

const Buf = native.Buf;

Buf.prototype.grow = promisifyAll(Buf.prototype.grow);
Buf.prototype.set = promisifyAll(Buf.prototype.set);

export default Buf;
