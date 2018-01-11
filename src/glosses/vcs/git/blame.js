const {
    promise: { promisifyAll },
    vcs: { git }
} = adone;

const { native } = git;

const Blame = native.Blame;

Blame.FLAG = {
    NORMAL: 0,
    TRACK_COPIES_SAME_FILE: 1,
    TRACK_COPIES_SAME_COMMIT_MOVES: 2,
    TRACK_COPIES_SAME_COMMIT_COPIES: 4,
    TRACK_COPIES_ANY_COMMIT_COPIES: 8,
    FIRST_PARENT: 16
};

/**
 * Retrieve the blame of a file
 *
 * @async
 * @param {Repository} repo that contains the file
 * @param {String} path to the file to get the blame of
 * @param {BlameOptions} [options] Options for the blame
 */
const asyncFile = promisifyAll(Blame.file);
Blame.file = function (repo, path, options) {
    options = git.Utils.normalizeOptions(options, git.BlameOptions);

    return asyncFile.call(this, repo, path, options);
};

Blame.prototype.buffer = promisifyAll(Blame.prototype.buffer);

export default Blame;
