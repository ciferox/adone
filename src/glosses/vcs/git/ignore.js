const native = adone.bind("git.node");

const Ignore = native.Ignore;

Ignore.pathIsIgnored = adone.promise.promisifyAll(Ignore.pathIsIgnored);

export default Ignore;
