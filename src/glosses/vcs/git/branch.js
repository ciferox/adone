const native = adone.bind("git.node");

const Branch = native.Branch;

Branch.BRANCH = {
    LOCAL: 1,
    REMOTE: 2,
    ALL: 3
};

Branch.create = adone.promise.promisifyAll(Branch.create);
Branch.createFromAnnotated = adone.promise.promisifyAll(Branch.createFromAnnotated);
Branch.iteratorNew = adone.promise.promisifyAll(Branch.iteratorNew);
Branch.lookup = adone.promise.promisifyAll(Branch.lookup);
Branch.move = adone.promise.promisifyAll(Branch.move);
Branch.name = adone.promise.promisifyAll(Branch.name);
Branch.setUpstream = adone.promise.promisifyAll(Branch.setUpstream);
Branch.upstream = adone.promise.promisifyAll(Branch.upstream);

const asyncRemoteName = adone.promise.promisifyAll(Branch.remoteName);

/**
 * Retrieve the Branch's Remote Name as a String.
 *
 *  @async
 * @param {Repository} repo The repo to get the remote name from
 * @param {String} the refname of the branch
 * @return {String} remote name as a string.
 */
Branch.remoteName = function (repo, remoteRef) {
    return asyncRemoteName.call(this, repo, remoteRef).then((remoteNameBuffer) => remoteNameBuffer.toString());
};

export default Branch;
