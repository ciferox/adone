const native = adone.nativeAddon("git.node");

const {
    promise: { promisifyAll }
} = adone;

const Hashsig = native.Hashsig;

Hashsig.create = promisifyAll(Hashsig.create);
Hashsig.createFromFile = promisifyAll(Hashsig.createFromFile);

export default Hashsig;
