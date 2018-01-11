const {
    promise: { promisifyAll },
    vcs: { git: { native } }
} = adone;

const Hashsig = native.Hashsig;

Hashsig.create = promisifyAll(Hashsig.create);
Hashsig.createFromFile = promisifyAll(Hashsig.createFromFile);

export default Hashsig;
