const native = adone.bind("git.node");

const Hashsig = native.Hashsig;

Hashsig.create = adone.promise.promisifyAll(Hashsig.create);
Hashsig.createFromFile = adone.promise.promisifyAll(Hashsig.createFromFile);

export default Hashsig;
