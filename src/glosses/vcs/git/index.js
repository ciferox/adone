export const native = adone.nativeAddon(adone.std.path.join(__dirname, "native", "git.node"));

export const Time = native.Time;
export const Treebuilder = native.Treebuilder;
export const FilterSource = native.FilterSource;
export const Giterr = native.Giterr;
export const PushOptions = native.PushOptions;
export const MergeOptions = native.MergeOptions;
export const FetchOptions = native.FetchOptions;
export const RemoteCallbacks = native.RemoteCallbacks;
export const ProxyOptions = native.ProxyOptions;
export const CloneOptions = native.CloneOptions;
export const DiffOptions = native.DiffOptions;
export const DiffFindOptions = native.DiffFindOptions;
export const CheckoutOptions = native.CheckoutOptions;
export const CherrypickOptions = native.CherrypickOptions;
export const RepositoryInitOptions = native.RepositoryInitOptions;
export const StatusOptions = native.StatusOptions;
export const BlameOptions = native.BlameOptions;
export const StashApplyOptions = native.StashApplyOptions;
export const RebaseOptions = native.RebaseOptions;
export const RevertOptions = native.RevertOptions;
export const SubmoduleUpdateOptions = native.SubmoduleUpdateOptions;
export const getThreadSafetyStatus = native.getThreadSafetyStatus;
export const enableThreadSafety = native.enableThreadSafety;
export const setThreadSafetyStatus = native.setThreadSafetyStatus;
export const getThreadSafetyDiagnostics = native.getThreadSafetyDiagnostics;
export const THREAD_SAFETY = native.THREAD_SAFETY;
export const Indexer = native.Indexer;
export const Libgit2 = native.Libgit2;
Libgit2.OPT = {
    GET_MWINDOW_SIZE: 0,
    SET_MWINDOW_SIZE: 1,
    GET_MWINDOW_MAPPED_LIMIT: 2,
    SET_MWINDOW_MAPPED_LIMIT: 3,
    GET_SEARCH_PATH: 4,
    SET_SEARCH_PATH: 5,
    SET_CACHE_OBJECT_LIMIT: 6,
    SET_CACHE_MAX_SIZE: 7,
    ENABLE_CACHING: 8,
    GET_CACHED_MEMORY: 9,
    GET_TEMPLATE_PATH: 10,
    SET_TEMPLATE_PATH: 11,
    SET_SSL_CERT_LOCATIONS: 12,
    SET_USER_AGENT: 13,
    ENABLE_STRICT_OBJECT_CREATION: 14,
    ENABLE_STRICT_SYMBOLIC_REF_CREATION: 15,
    SET_SSL_CIPHERS: 16,
    GET_USER_AGENT: 17
};

export const Oidarray = native.Oidarray;
export const Openssl = native.Openssl;

exports.Proxy = native.Proxy;
exports.Proxy.PROXY = {
    NONE: 0,
    AUTO: 1,
    SPECIFIED: 2
};

export const Push = native.Push;

export const Refdb = native.Refdb;
Refdb.open = adone.promise.promisifyAll(native.Refdb.open);

export const ReflogEntry = native.ReflogEntry;
export const Refspec = native.Refspec;
export const Strarray = native.Strarray;
export const Transport = native.Transport;
Transport.sshWithPaths = adone.promise.promisifyAll(native.Transport.sshWithPaths);
Transport.FLAGS = {
    NONE: 0
};

export const DiffBinary = native.DiffBinary;
DiffBinary.DIFF_BINARY = {
    NONE: 0,
    LITERAL: 1,
    DELTA: 2
};

export const Hashsig = native.Hashsig;
Hashsig.OPTION = {
    NORMAL: 0,
    IGNORE_WHITESPACE: 1,
    SMART_WHITESPACE: 2,
    ALLOW_SMALL_FILES: 4
};

export const Trace = native.Trace;
Trace.LEVEL = {
    NONE: 0,
    FATAL: 1,
    ERROR: 2,
    WARN: 3,
    INFO: 4,
    DEBUG: 5,
    TRACE: 6
};


export const Enums = {
    CVAR: {
        FALSE: 0,
        TRUE: 1,
        INT32: 2,
        STRING: 3
    },
    DIRECTION: {
        FETCH: 0,
        PUSH: 1
    },
    FEATURE: {
        THREADS: 1,
        HTTPS: 2,
        SSH: 4,
        NSEC: 8
    },
    IDXENTRY_EXTENDED_FLAG: {
        IDXENTRY_INTENT_TO_ADD: 8192,
        IDXENTRY_SKIP_WORKTREE: 16384,
        IDXENTRY_EXTENDED2: 32768,
        S: 24576,
        IDXENTRY_UPDATE: 1,
        IDXENTRY_REMOVE: 2,
        IDXENTRY_UPTODATE: 4,
        IDXENTRY_ADDED: 8,
        IDXENTRY_HASHED: 16,
        IDXENTRY_UNHASHED: 32,
        IDXENTRY_WT_REMOVE: 64,
        IDXENTRY_CONFLICTED: 128,
        IDXENTRY_UNPACKED: 256,
        IDXENTRY_NEW_SKIP_WORKTREE: 512
    },
    INDXENTRY_FLAG: {
        IDXENTRY_EXTENDED: 16384,
        IDXENTRY_VALID: 32768
    }
};

export const Cert = {
    TYPE: {
        NONE: 0,
        X509: 1,
        HOSTKEY_LIBSSH2: 2,
        STRARRAY: 3
    },
    SSH: {
        MD5: 1,
        SHA1: 2
    }
};

export const RebaseOperation = {
    REBASE_OPERATION: {
        PICK: 0,
        REWORD: 1,
        EDIT: 2,
        SQUASH: 3,
        FIXUP: 4,
        EXEC: 5
    }
};

export const Error = {
    ERROR: {
        GITERR_NONE: 0,
        GITERR_NOMEMORY: 1,
        GITERR_OS: 2,
        GITERR_INVALID: 3,
        GITERR_REFERENCE: 4,
        GITERR_ZLIB: 5,
        GITERR_REPOSITORY: 6,
        GITERR_CONFIG: 7,
        GITERR_REGEX: 8,
        GITERR_ODB: 9,
        GITERR_INDEX: 10,
        GITERR_OBJECT: 11,
        GITERR_NET: 12,
        GITERR_TAG: 13,
        GITERR_TREE: 14,
        GITERR_INDEXER: 15,
        GITERR_SSL: 16,
        GITERR_SUBMODULE: 17,
        GITERR_THREAD: 18,
        GITERR_STASH: 19,
        GITERR_CHECKOUT: 20,
        GITERR_FETCHHEAD: 21,
        GITERR_MERGE: 22,
        GITERR_SSH: 23,
        GITERR_FILTER: 24,
        GITERR_REVERT: 25,
        GITERR_CALLBACK: 26,
        GITERR_CHERRYPICK: 27,
        GITERR_DESCRIBE: 28,
        GITERR_REBASE: 29,
        GITERR_FILESYSTEM: 30,
        GITERR_PATCH: 31
    },
    CODE: {
        OK: 0,
        ERROR: -1,
        ENOTFOUND: -3,
        EEXISTS: -4,
        EAMBIGUOUS: -5,
        EBUFS: -6,
        EUSER: -7,
        EBAREREPO: -8,
        EUNBORNBRANCH: -9,
        EUNMERGED: -10,
        ENONFASTFORWARD: -11,
        EINVALIDSPEC: -12,
        ECONFLICT: -13,
        ELOCKED: -14,
        EMODIFIED: -15,
        EAUTH: -16,
        ECERTIFICATE: -17,
        EAPPLIED: -18,
        EPEEL: -19,
        EEOF: -20,
        EINVALID: -21,
        EUNCOMMITTED: -22,
        EDIRECTORY: -23,
        EMERGECONFLICT: -24,
        PASSTHROUGH: -30,
        ITEROVER: -31
    }
};

adone.lazify({
    AnnotatedCommit: "./annotated_commit",
    Attr: "./attr",
    Blame: "./blame",
    Blob: "./blob",
    Branch: "./branch",
    Buf: "./buf",
    Checkout: "./checkout",
    Cherrypick: "./cherrypick",
    Clone: "./clone",
    Commit: "./commit",
    Config: "./config",
    ConvenientHunk: "./convenient_hunks",
    ConvenientPatch: "./convenient_patch",
    Cred: "./cred",
    Diff: "./diff",
    DiffFile: "./diff_file",
    DiffLine: "./diff_line",
    Fetch: "./fetch",
    Filter: "./filter",
    FilterList: "./filter_list",
    FilterRegistry: "./filter_registry",
    Graph: "./graph",
    Hashing: "./hashing",
    Ignore: "./ignore",
    Index: "./git_index",
    Merge: "./merge",
    Note: "./note",
    Object: "./object",
    Odb: "./odb",
    OdbObject: "./odb_object",
    Oid: "./oid",
    Packbuilder: "./packbuilder",
    Patch: "./patch",
    Pathspec: "./pathspec",
    Rebase: "./rebase",
    Reference: "./reference",
    Reflog: "./reflog",
    Remote: "./remote",
    Repository: "./repository",
    Reset: "./reset",
    Revert: "./revert",
    Revparse: "./revparse",
    Revwalk: "./revwalk",
    Signature: "./signature",
    Stash: "./stash",
    Status: "./status",
    StatusFile: "./status_file",
    StatusList: "./status_list",
    Submodule: "./submodule",
    Tag: "./tag",
    Tree: "./tree",
    TreeBuilder: "./tree_builder",
    TreeEntry: "./tree_entry",
    Utils: () => adone.lazify({
        lookupWrapper: "./utils/lookup_wrapper",
        normalizeOptions: "./utils/normalize_options",
        shallowClone: "./utils/shallow_clone",
        normalizeFetchOptions: "./utils/normalize_fetch_options"
    }, null, require)
}, adone.asNamespace(exports), require);

// For disccussion on why `cloneDeep` is required, see:
// https://github.com/facebook/jest/issues/3552
// https://github.com/facebook/jest/issues/3550
// https://github.com/nodejs/node/issues/5016
exports.__proto__ = adone.lodash.cloneDeep(native);
