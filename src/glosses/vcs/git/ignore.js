const native = adone.nativeAddon("git.node");

const Ignore = native.Ignore;

Ignore.pathIsIgnored = adone.promise.promisifyAll(Ignore.pathIsIgnored);

export default Ignore;
