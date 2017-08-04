const native = adone.bind("git.node");

const TreeBuilder = native.Treebuilder;

TreeBuilder.prototype.insert = adone.promise.promisifyAll(TreeBuilder.prototype.insert);
TreeBuilder.create = adone.promise.promisifyAll(TreeBuilder.create);

export default TreeBuilder;
