const {
    promise: { promisifyAll },
    vcs: { git: { native } }
} = adone;

const Patch = native.Patch;

Patch.fromBlobAndBuffer = promisifyAll(Patch.fromBlobAndBuffer);
Patch.fromBlobs = promisifyAll(Patch.fromBlobs);
Patch.fromDiff = promisifyAll(Patch.fromDiff);
Patch.prototype.getHunk = promisifyAll(Patch.prototype.getHunk);
Patch.prototype.getLineInHunk = promisifyAll(Patch.prototype.getLineInHunk);
Patch.convenientFromDiff = promisifyAll(Patch.convenientFromDiff);

// no such method
// Patch.prototype.hunks = promisifyAll(Patch.prototype.hunks);

export default Patch;
