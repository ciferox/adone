const {
    promise: { promisifyAll },
    vcs: { git: { native } }
} = adone;

const Graph = native.Graph;

Graph.aheadBehind = promisifyAll(Graph.aheadBehind);
Graph.descendantOf = promisifyAll(Graph.descendantOf);

export default Graph;
