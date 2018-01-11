const {
    promise: { promisifyAll },
    vcs: { git: { native } }
} = adone;

const Branch = native.Branch;

Branch.BRANCH = {
    LOCAL: 1,
    REMOTE: 2,
    ALL: 3
};

Branch.create = promisifyAll(Branch.create);
Branch.createFromAnnotated = promisifyAll(Branch.createFromAnnotated);
Branch.iteratorNew = promisifyAll(Branch.iteratorNew);
Branch.lookup = promisifyAll(Branch.lookup);
Branch.move = promisifyAll(Branch.move);
Branch.name = promisifyAll(Branch.name);
Branch.setUpstream = promisifyAll(Branch.setUpstream);
Branch.upstream = promisifyAll(Branch.upstream);

const asyncRemoteName = promisifyAll(Branch.remoteName);

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
