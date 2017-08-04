const native = adone.bind("git.node");

const Pathspec = native.Pathspec;

Pathspec.FLAG = {
    DEFAULT: 0,
    IGNORE_CASE: 1,
    USE_CASE: 2,
    NO_GLOB: 4,
    NO_MATCH_ERROR: 8,
    FIND_FAILURES: 16,
    FAILURES_ONLY: 32
};

Pathspec.prototype.matchDiff = adone.promise.promisifyAll(Pathspec.prototype.matchDiff);
Pathspec.prototype.matchIndex = adone.promise.promisifyAll(Pathspec.prototype.matchIndex);
Pathspec.prototype.matchTree = adone.promise.promisifyAll(Pathspec.prototype.matchTree);
Pathspec.prototype.matchWorkdir = adone.promise.promisifyAll(Pathspec.prototype.matchWorkdir);

export default Pathspec;
