const {
    vcs: { git: { native } }
} = adone;

const {
    promise: { promisifyAll },
    vcs: { git: {
        DiffFile, // force load in case of indirect instantiation
        DiffLine, // force load in case of indirect instantiation
        DiffOptions,
        DiffFindOptions,
        Patch,
        Utils: { normalizeOptions } } }
} = adone;

const Diff = native.Diff;

Diff.DELTA = {
    UNMODIFIED: 0,
    ADDED: 1,
    DELETED: 2,
    MODIFIED: 3,
    RENAMED: 4,
    COPIED: 5,
    IGNORED: 6,
    UNTRACKED: 7,
    TYPECHANGE: 8,
    UNREADABLE: 9,
    CONFLICTED: 10
};

Diff.FIND = {
    BY_CONFIG: 0,
    RENAMES: 1,
    RENAMES_FROM_REWRITES: 2,
    COPIES: 4,
    COPIES_FROM_UNMODIFIED: 8,
    REWRITES: 16,
    BREAK_REWRITES: 32,
    AND_BREAK_REWRITES: 48,
    FOR_UNTRACKED: 64,
    ALL: 255,
    IGNORE_LEADING_WHITESPACE: 0,
    IGNORE_WHITESPACE: 4096,
    DONT_IGNORE_WHITESPACE: 8192,
    EXACT_MATCH_ONLY: 16384,
    BREAK_REWRITES_FOR_RENAMES_ONLY: 32768,
    REMOVE_UNMODIFIED: 65536
};

Diff.FLAG = {
    BINARY: 1,
    NOT_BINARY: 2,
    VALID_ID: 4,
    EXISTS: 8
};

Diff.FORMAT = {
    PATCH: 1,
    PATCH_HEADER: 2,
    RAW: 3,
    NAME_ONLY: 4,
    NAME_STATUS: 5
};

Diff.FORMAT_EMAIL_FLAGS = {
    FORMAT_EMAIL_NONE: 0,
    FORMAT_EMAIL_EXCLUDE_SUBJECT_PATCH_MARKER: 1
};

Diff.LINE = {
    CONTEXT: 32,
    ADDITION: 43,
    DELETION: 45,
    CONTEXT_EOFNL: 61,
    ADD_EOFNL: 62,
    DEL_EOFNL: 60,
    FILE_HDR: 70,
    HUNK_HDR: 72,
    BINARY: 66
};

Diff.OPTION = {
    NORMAL: 0,
    REVERSE: 1,
    INCLUDE_IGNORED: 2,
    RECURSE_IGNORED_DIRS: 4,
    INCLUDE_UNTRACKED: 8,
    RECURSE_UNTRACKED_DIRS: 16,
    INCLUDE_UNMODIFIED: 32,
    INCLUDE_TYPECHANGE: 64,
    INCLUDE_TYPECHANGE_TREES: 128,
    IGNORE_FILEMODE: 256,
    IGNORE_SUBMODULES: 512,
    IGNORE_CASE: 1024,
    INCLUDE_CASECHANGE: 2048,
    DISABLE_PATHSPEC_MATCH: 4096,
    SKIP_BINARY_CHECK: 8192,
    ENABLE_FAST_UNTRACKED_DIRS: 16384,
    UPDATE_INDEX: 32768,
    INCLUDE_UNREADABLE: 65536,
    INCLUDE_UNREADABLE_AS_UNTRACKED: 131072,
    FORCE_TEXT: 1048576,
    FORCE_BINARY: 2097152,
    IGNORE_WHITESPACE: 4194304,
    IGNORE_WHITESPACE_CHANGE: 8388608,
    IGNORE_WHITESPACE_EOL: 16777216,
    SHOW_UNTRACKED_CONTENT: 33554432,
    SHOW_UNMODIFIED: 67108864,
    PATIENCE: 268435456,
    MINIMAL: 536870912,
    SHOW_BINARY: 1073741824
};

Diff.STATS_FORMAT = {
    STATS_NONE: 0,
    STATS_FULL: 1,
    STATS_SHORT: 2,
    STATS_NUMBER: 4,
    STATS_INCLUDE_SUMMARY: 8
};

Diff.blobToBuffer = promisifyAll(Diff.blobToBuffer);
Diff.prototype.findSimilar = promisifyAll(Diff.prototype.findSimilar);
Diff.fromBuffer = promisifyAll(Diff.fromBuffer);
Diff.prototype.getPerfdata = promisifyAll(Diff.prototype.getPerfdata);
Diff.indexToIndex = promisifyAll(Diff.indexToIndex);
Diff.indexToWorkdir = promisifyAll(Diff.indexToWorkdir);
Diff.prototype.merge = promisifyAll(Diff.prototype.merge);
Diff.prototype.toBuf = promisifyAll(Diff.prototype.toBuf);
Diff.treeToIndex = promisifyAll(Diff.treeToIndex);
Diff.treeToTree = promisifyAll(Diff.treeToTree);
Diff.treeToWorkdir = promisifyAll(Diff.treeToWorkdir);
Diff.treeToWorkdirWithIndex = promisifyAll(Diff.treeToWorkdirWithIndex);


const _blobToBuffer = Diff.blobToBuffer;
const _indexToWorkdir = Diff.indexToWorkdir;
const _treeToIndex = Diff.treeToIndex;
const _treeToTree = Diff.treeToTree;
const _treeToWorkdir = Diff.treeToWorkdir;
const _treeToWorkdirWithIndex = Diff.treeToWorkdirWithIndex;

const _findSimilar = Diff.prototype.findSimilar;

/**
 * Directly run a diff between a blob and a buffer.
 * @async
 * @param {Blob} old_blob Blob for old side of diff, or NULL for empty blob
 * @param {String} old_as_path Treat old blob as if it had this filename;
 * can be NULL
 * @param {String} buffer Raw data for new side of diff, or NULL for empty
 * @param {String} buffer_as_path Treat buffer as if it had this filename;
 * can be NULL
 * @param {DiffOptions} opts Options for diff, or NULL for default options
 * @param {Function} file_cb Callback for "file"; made once if there is a diff;
 * can be NULL
 * @param {Function} binary_cb Callback for binary files; can be NULL
 * @param {Function} hunk_cb Callback for each hunk in diff; can be NULL
 * @param {Function} line_cb Callback for each line in diff; can be NULL
 */
Diff.blobToBuffer = function (oldBlob, oldAsPath, buffer, bufferAsPath, opts, fileCb, binaryCb, hunkCb, lineCb) {
    let bufferText;
    let bufferLength;
    if (buffer instanceof Buffer) {
        bufferText = buffer.toString("utf8");
        bufferLength = Buffer.byteLength(buffer, "utf8");
    } else {
        bufferText = buffer;
        bufferLength = !buffer ? 0 : Buffer.byteLength(buffer, "utf8");
    }

    opts = normalizeOptions(opts, DiffOptions);

    return _blobToBuffer.call(
        this,
        oldBlob,
        oldAsPath,
        bufferText,
        bufferLength,
        bufferAsPath,
        opts,
        fileCb,
        binaryCb,
        hunkCb,
        lineCb,
        null);
};

// Override Diff.indexToWorkdir to normalize opts
Diff.indexToWorkdir = function (repo, index, opts) {
    opts = normalizeOptions(opts, DiffOptions);
    return _indexToWorkdir(repo, index, opts);
};

// Override Diff.treeToIndex to normalize opts
Diff.treeToIndex = function (repo, tree, index, opts) {
    opts = normalizeOptions(opts, DiffOptions);
    return _treeToIndex(repo, tree, index, opts);
};

// Override Diff.treeToTree to normalize opts
Diff.treeToTree = function (repo, fromTree, toTree, opts) {
    opts = normalizeOptions(opts, DiffOptions);
    return _treeToTree(repo, fromTree, toTree, opts);
};

// Override Diff.treeToWorkdir to normalize opts
Diff.treeToWorkdir = function (repo, tree, opts) {
    opts = normalizeOptions(opts, DiffOptions);
    return _treeToWorkdir(repo, tree, opts);
};

// Override Diff.treeToWorkdir to normalize opts
Diff.treeToWorkdirWithIndex = function (repo, tree, opts) {
    opts = normalizeOptions(opts, DiffOptions);
    return _treeToWorkdirWithIndex(repo, tree, opts);
};

// Override Diff.findSimilar to normalize opts
Diff.prototype.findSimilar = function (opts) {
    opts = normalizeOptions(opts, DiffFindOptions);
    return _findSimilar.call(this, opts);
};

/**
 * Retrieve patches in this difflist
 *
 * @async
 * @return {Array<ConvenientPatch>} a promise that resolves to an array of
 *                                      ConvenientPatches
 */
Diff.prototype.patches = function () {
    return Patch.convenientFromDiff(this);
};

export default Diff;
