const native = adone.bind("git.node");

const AnnotatedCommit = native.AnnotatedCommit;

AnnotatedCommit.fromFetchhead = adone.promise.promisifyAll(AnnotatedCommit.fromFetchhead);
AnnotatedCommit.fromRef = adone.promise.promisifyAll(AnnotatedCommit.fromRef);
AnnotatedCommit.fromRevspec = adone.promise.promisifyAll(AnnotatedCommit.fromRevspec);
AnnotatedCommit.lookup = adone.promise.promisifyAll(AnnotatedCommit.lookup);

export default AnnotatedCommit;
