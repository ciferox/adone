const native = adone.bind("git.node");

const {
    promise
} = adone;

const Index = native.Index;

Index.ADD_OPTION = {
    ADD_DEFAULT: 0,
    ADD_FORCE: 1,
    ADD_DISABLE_PATHSPEC_MATCH: 2,
    ADD_CHECK_PATHSPEC: 4
};

Index.CAP = {
    IGNORE_CASE: 1,
    NO_FILEMODE: 2,
    NO_SYMLINKS: 4,
    FROM_OWNER: -1
};

Index.prototype.add = promise.promisifyAll(Index.prototype.add);
Index.prototype.addByPath = promise.promisifyAll(Index.prototype.addByPath);
Index.prototype.clear = promise.promisifyAll(Index.prototype.clear);
Index.prototype.conflictAdd = promise.promisifyAll(Index.prototype.conflictAdd);
Index.prototype.conflictCleanup = promise.promisifyAll(Index.prototype.conflictCleanup);
Index.prototype.conflictGet = promise.promisifyAll(Index.prototype.conflictGet);
Index.prototype.conflictRemove = promise.promisifyAll(Index.prototype.conflictRemove);
Index.open = promise.promisifyAll(Index.open);
Index.prototype.read = promise.promisifyAll(Index.prototype.read);
Index.prototype.readTree = promise.promisifyAll(Index.prototype.readTree);
Index.prototype.remove = promise.promisifyAll(Index.prototype.remove);
Index.prototype.removeByPath = promise.promisifyAll(Index.prototype.removeByPath);
Index.prototype.removeDirectory = promise.promisifyAll(Index.prototype.removeDirectory);
Index.prototype.write = promise.promisifyAll(Index.prototype.write);
Index.prototype.writeTree = promise.promisifyAll(Index.prototype.writeTree);
Index.prototype.writeTreeTo = promise.promisifyAll(Index.prototype.writeTreeTo);

const asyncAddAll = promise.promisifyAll(Index.prototype.addAll);
const asyncRemoveAll = promise.promisifyAll(Index.prototype.removeAll);
const asyncUpdateAll = promise.promisifyAll(Index.prototype.updateAll);

Index.prototype.addAll = function (pathspec, flags, matchedCallback) {
    return asyncAddAll.call(this, pathspec || "*", flags, matchedCallback, null);
};

/**
 * Return an array of the entries in this index.
 * @return {Array<IndexEntry>} an array of IndexEntrys
 */
Index.prototype.entries = function () {
    const size = this.entryCount();
    const result = [];

    for (let i = 0; i < size; i++) {
        result.push(this.getByIndex(i));
    }

    return result;
};

Index.prototype.removeAll = function (pathspec, matchedCallback) {
    return asyncRemoveAll.call(this, pathspec || "*", matchedCallback, null);
};

Index.prototype.updateAll = function (pathspec, matchedCallback) {
    return asyncUpdateAll.call(this, pathspec || "*", matchedCallback, null);
};

export default Index;
