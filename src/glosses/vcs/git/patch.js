const native = adone.bind("git.node");

const {
    promise
} = adone;

const Patch = native.Patch;

Patch.fromBlobAndBuffer = promise.promisifyAll(Patch.fromBlobAndBuffer);
Patch.fromBlobs = promise.promisifyAll(Patch.fromBlobs);
Patch.fromDiff = promise.promisifyAll(Patch.fromDiff);
Patch.prototype.getHunk = promise.promisifyAll(Patch.prototype.getHunk);
Patch.prototype.getLineInHunk = promise.promisifyAll(Patch.prototype.getLineInHunk);
Patch.convenientFromDiff = promise.promisifyAll(Patch.convenientFromDiff);
Patch.prototype.hunks = promise.promisifyAll(Patch.prototype.hunks);

export default Patch;
