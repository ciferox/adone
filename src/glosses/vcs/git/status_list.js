const native = adone.bind("git.node");

const {
    promise: { promisifyAll },
    vcs: { git: { StatusOptions, Utils: { normalizeOptions } } }
} = adone;

const StatusList = native.StatusList;

StatusList.prototype.getPerfdata = promisifyAll(StatusList.prototype.getPerfdata);

const asyncCreate = promisifyAll(StatusList.create);

// Override StatusList.create to normalize opts
StatusList.create = function (repo, opts) {
    opts = normalizeOptions(opts, StatusOptions);
    return asyncCreate(repo, opts);
};

export default StatusList;
