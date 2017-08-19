const native = adone.bind("git.node");

const {
    promise: { promisifyAll }
} = adone;

const Graph = native.Graph;

Graph.aheadBehind = promisifyAll(Graph.aheadBehind);
Graph.descendantOf = promisifyAll(Graph.descendantOf);

export default Graph;
