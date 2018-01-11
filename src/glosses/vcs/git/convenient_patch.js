const {
    vcs: { git: { native } }
} = adone;

const ConvenientPatch = native.ConvenientPatch;

ConvenientPatch.prototype.hunks = adone.promise.promisifyAll(ConvenientPatch.prototype.hunks);

const hunks = ConvenientPatch.prototype.hunks;
/**
 * The hunks in this patch
 * @async
 * @return {Array<ConvenientHunk>}  a promise that resolves to an array of
 *                                      ConvenientHunks
 */
ConvenientPatch.prototype.hunks = hunks;

const isAdded = ConvenientPatch.prototype.isAdded;
/**
 * Is this an added patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isAdded = isAdded;

const isConflicted = ConvenientPatch.prototype.isConflicted;
/**
 * Is this a conflicted patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isConflicted = isConflicted;

const isCopied = ConvenientPatch.prototype.isCopied;
/**
 * Is this a copied patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isCopied = isCopied;

const isDeleted = ConvenientPatch.prototype.isDeleted;
/**
 * Is this a deleted patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isDeleted = isDeleted;

const isIgnored = ConvenientPatch.prototype.isIgnored;
/**
 * Is this an ignored patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isIgnored = isIgnored;

const isModified = ConvenientPatch.prototype.isModified;
/**
 * Is this an modified patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isModified = isModified;

const isRenamed = ConvenientPatch.prototype.isRenamed;
/**
 * Is this a renamed patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isRenamed = isRenamed;

const isTypeChange = ConvenientPatch.prototype.isTypeChange;
/**
 * Is this a type change?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isTypeChange = isTypeChange;

const isUnmodified = ConvenientPatch.prototype.isUnmodified;
/**
 * Is this an unmodified patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isUnmodified = isUnmodified;

const isUnreadable = ConvenientPatch.prototype.isUnreadable;
/**
 * Is this an undreadable patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isUnreadable = isUnreadable;

const isUntracked = ConvenientPatch.prototype.isUntracked;
/**
 * Is this an untracked patch?
 * @return {Boolean}
 */
ConvenientPatch.prototype.isUntracked = isUntracked;

/**
 * @typedef lineStats
 * @type {Object}
 * @property {number} total_context # of contexts in the patch
 * @property {number} total_additions # of lines added in the patch
 * @property {number} total_deletions # of lines deleted in the patch
 */
const lineStats = ConvenientPatch.prototype.lineStats;
/**
 * The line statistics of this patch (#contexts, #added, #deleted)
 * @return {lineStats}
 */
ConvenientPatch.prototype.lineStats = lineStats;

const newFile = ConvenientPatch.prototype.newFile;
/**
 * New attributes of the file
 * @return {DiffFile}
 */
ConvenientPatch.prototype.newFile = newFile;

const oldFile = ConvenientPatch.prototype.oldFile;
/**
 * Old attributes of the file
 * @return {DiffFile}
 */
ConvenientPatch.prototype.oldFile = oldFile;

const size = ConvenientPatch.prototype.size;
/**
 * The number of hunks in this patch
 * @return {Number}
 */
ConvenientPatch.prototype.size = size;

const status = ConvenientPatch.prototype.status;
/**
 * The status of this patch (unmodified, added, deleted)
 * @return {Number}
 */
ConvenientPatch.prototype.status = status;

export default ConvenientPatch;
