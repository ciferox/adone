const { is } = adone;

const uniqueNodes = (arr) => {
    const res = new Set();
    for (let i = 0, len = arr.length; i < len; i++) {
        res.add(arr[i][0]);
        res.add(arr[i][1]);
    }
    return [...res];
};

const toposortArray = (nodes, edges) => {
    //initialize the placement of nodes into the sorted array at the end
    let place = nodes.length;

    //initialize the sorted array with the same length as the unique nodes array
    const sorted = new Array(nodes.length);

    //define a visitor function that recursively traverses dependencies.
    const visit = (node, predecessors) => {
        //check if a node is dependent of itself
        if ( predecessors.length !== 0 && predecessors.includes(node)) {
            throw new Error( `Cyclic dependency found. ${node} is dependent of itself.\nDependency chain: ${predecessors.join( " -> " )} => ${node}` );
        }

        const index = nodes.indexOf(node);

        //if the node still exists, traverse its dependencies
        if (index !== -1) {
            let copy = false;

            //mark the node as false to exclude it from future iterations
            nodes[index] = false;

            //loop through all edges and follow dependencies of the current node
            for (const edge of edges) {
                if (edge[0] === node) {
                    // lazily create a copy of predecessors with the current node concatenated onto it
                    copy = copy || predecessors.concat([node]);

                    // recurse to node dependencies
                    visit(edge[1], copy);
                }
            }

            //add the node to the next place in the sorted array
            sorted[--place] = node;
        }
    };

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        //ignore nodes that have been excluded
        if (node !== false) {
            //mark the node as false to exclude it from future iterations
            nodes[i] = false;

            //loop through all edges and follow dependencies of the current node
            for (const edge of edges) {
                if (edge[0] === node) {
                    //recurse to node dependencies
                    visit( edge[1], [node]);
                }
            }

            //add the node to the next place in the sorted array
            sorted[--place] = node;
        }
    }

    return sorted;
};

export default function toposort(edges) {
    return toposortArray(uniqueNodes(edges), edges);
}

toposort.array = toposortArray;
toposort.Sorter = class Sorter {
    constructor() {
        this.edges = [];
    }

    add(item, deps) {
        if (!is.string(item) || !item) {
            throw new TypeError("Dependent name must be given as a not empty string");
        }

        deps = is.array(deps) ? deps : [deps];

        if (deps.length > 0) {
            for (const dep of deps) {
                if (!is.string(dep) || !dep) {
                    throw new TypeError("Dependency name must be given as a not empty string");
                }

                this.edges.push([item, dep]);
            }

        } else {
            this.edges.push([item]);
        }

        return this;
    }

    sort() {
        const nodes = [];

        for (const edge of this.edges) {
            for (const node of edge) {
                if (!nodes.includes(node)) {
                    nodes.push(node);
                }
            }
        }

        return toposortArray(nodes, this.edges);
    }

    clear() {
        this.edges = [];
        return this;
    }
};
