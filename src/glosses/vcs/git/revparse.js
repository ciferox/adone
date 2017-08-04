const native = adone.bind("git.node");

// force load in case of indirect instantiation
const { vcs: { git: { Object: Obj } } } = adone;

const Revparse = native.Revparse;

Revparse.MODE = {
    SINGLE: 1,
    RANGE: 2,
    MERGE_BASE: 4
};

Revparse.single = adone.promise.promisifyAll(Revparse.single);

export default Revparse;
