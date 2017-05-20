export default function toposort(edges) {
    return toposortArray(uniqueNodes(edges), edges);
}

toposort.array = toposortArray;

function uniqueNodes(arr) {
    const res = new Set();
    for (let i = 0, len = arr.length; i < len; i++) {
        res.add(arr[i][0]);
        res.add(arr[i][1]);
    }
    return [...res];
}

function toposortArray(nodes, edges) {
    let cursor = nodes.length;
    const sorted = new Array(cursor);
    const visited = {};
    let i = cursor;

    while (i--) {
        if (!visited[i]) {
            visit(nodes[i], i, []);
        }
    }

    return sorted;

    function visit(node, i, predecessors) {
        if (predecessors.indexOf(node) >= 0) {
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
        if (i = outgoing.length) {
            const preds = predecessors.concat(node);
            do {
                const child = outgoing[--i][1];
                visit(child, nodes.indexOf(child), preds);
            } while (i);
        }

        sorted[--cursor] = node;
    }
}
