const native = adone.bind("git.node");

const {
    promise,
    vcs: { git: { StatusOptions, Utils: { normalizeOptions } } }
} = adone;

const Status = native.Status;

Status.STATUS = {
    CURRENT: 0,
    INDEX_NEW: 1,
    INDEX_MODIFIED: 2,
    INDEX_DELETED: 4,
    INDEX_RENAMED: 8,
    INDEX_TYPECHANGE: 16,
    WT_NEW: 128,
    WT_MODIFIED: 256,
    WT_DELETED: 512,
    WT_TYPECHANGE: 1024,
    WT_RENAMED: 2048,
    WT_UNREADABLE: 4096,
    IGNORED: 16384,
    CONFLICTED: 32768
};

Status.OPT = {
    INCLUDE_UNTRACKED: 1,
    INCLUDE_IGNORED: 2,
    INCLUDE_UNMODIFIED: 4,
    EXCLUDE_SUBMODULES: 8,
    RECURSE_UNTRACKED_DIRS: 16,
    DISABLE_PATHSPEC_MATCH: 32,
    RECURSE_IGNORED_DIRS: 64,
    RENAMES_HEAD_TO_INDEX: 128,
    RENAMES_INDEX_TO_WORKDIR: 256,
    SORT_CASE_SENSITIVELY: 512,
    SORT_CASE_INSENSITIVELY: 1024,
    RENAMES_FROM_REWRITES: 2048,
    NO_REFRESH: 4096,
    UPDATE_INDEX: 8192,
    INCLUDE_UNREADABLE: 16384,
    INCLUDE_UNREADABLE_AS_UNTRACKED: 32768
};

Status.SHOW = {
    INDEX_AND_WORKDIR: 0,
    INDEX_ONLY: 1,
    WORKDIR_ONLY: 2
};

const asyncForeach = promise.promisifyAll(Status.foreach);
const asyncForeachExt = promise.promisifyAll(Status.foreachExt);

// Override Status.foreach to eliminate the need to pass null payload
Status.foreach = function (repo, callback) {
    return asyncForeach(repo, callback, null);
};

// Override Status.foreachExt to normalize opts
Status.foreachExt = function (repo, opts, callback) {
    opts = normalizeOptions(opts, StatusOptions);
    return asyncForeachExt(repo, opts, callback, null);
};

export default Status;
