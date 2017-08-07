const uniqueNodes = (arr) => {
    const res = new Set();
    for (let i = 0, len = arr.length; i < len; i++) {
        res.add(arr[i][0]);
        res.add(arr[i][1]);
    }
    return [...res];
};

const toposortArray = (nodes, edges) => {
    let cursor = nodes.length;
    const sorted = new Array(cursor);
    const visited = {};
    let i = cursor;

    const visit = (node, i, predecessors) => {
        if (predecessors.includes(node)) {
            throw new Error(`Cyclic dependency: ${JSON.stringify(node)}`);
        }

        if (!~nodes.indexOf(node)) {
            throw new Error(`Found unknown node. Make sure to provided all involved nodes. Unknown node: ${JSON.stringify(node)}`);
        }

        if (visited[i]) {
            return;
        }
        visited[i] = true;

        // outgoing edges
        const outgoing = edges.filter((edge) => {
            return edge[0] === node;
        });
        i = outgoing.length;
        if (i > 0) {
            const preds = predecessors.concat(node);
            do {
                const child = outgoing[--i][1];
                visit(child, nodes.indexOf(child), preds);
            } while (i);
        }

        sorted[--cursor] = node;
    };

    while (i--) {
        if (!visited[i]) {
            visit(nodes[i], i, []);
        }
    }

    return sorted;
};

export default function toposort(edges) {
    return toposortArray(uniqueNodes(edges), edges);
}

toposort.array = toposortArray;
