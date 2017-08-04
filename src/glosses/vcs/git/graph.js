const native = adone.bind("git.node");

const Graph = native.Graph;

Graph.aheadBehind = adone.promise.promisifyAll(Graph.aheadBehind);
Graph.descendantOf = adone.promise.promisifyAll(Graph.descendantOf);

export default Graph;
