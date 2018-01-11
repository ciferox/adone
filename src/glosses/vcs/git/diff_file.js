const {
    vcs: { git: { native } }
} = adone;

const DiffFile = native.DiffFile;

const flags = DiffFile.prototype.flags;
/**
 * Returns the file's flags
 * @return {Number}
 */
DiffFile.prototype.flags = flags;

const id = DiffFile.prototype.id;
/**
 * Returns the file's Oid
 * @return {Oid}
 */
DiffFile.prototype.id = id;

const mode = DiffFile.prototype.mode;
/**
 * Returns the file's mode
 * @return {Number}
 */
DiffFile.prototype.mode = mode;

const path = DiffFile.prototype.path;
/**
 * Returns the file's path
 * @return {String}
 */
DiffFile.prototype.path = path;

const size = DiffFile.prototype.size;
/**
 * Returns the file's size
 * @return {Number}
 */
DiffFile.prototype.size = size;

export default DiffFile;
