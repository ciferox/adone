const {
    promise: { promisifyAll },
    vcs: { git: { native } }
} = adone;

const TreeBuilder = native.Treebuilder;

TreeBuilder.create = promisifyAll(TreeBuilder.create);

export default TreeBuilder;
