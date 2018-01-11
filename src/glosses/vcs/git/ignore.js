const {
    vcs: { git: { native } }
} = adone;

const Ignore = native.Ignore;

Ignore.pathIsIgnored = adone.promise.promisifyAll(Ignore.pathIsIgnored);

export default Ignore;
