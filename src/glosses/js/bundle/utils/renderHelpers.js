const {
    is
} = adone;

export function findFirstOccurrenceOutsideComment(code, searchString, start = 0) {
    let commentStart, searchPos;
    while (true) {
        commentStart = code.indexOf("/", start);
        searchPos = code.indexOf(searchString, start);
        if (commentStart === -1) {
            break; 
        }
        if (searchPos >= commentStart) {
            searchPos = -1;
        } else if (searchPos !== -1) { 
            break; 
        }
        start = commentStart + 1;
        if (code.charCodeAt(start) === 42 /*"*"*/) {
            start = code.indexOf("*/", start) + 2;
        } else if (code.charCodeAt(start) === 47 /*"/"*/) {
            start = code.indexOf("\n", start) + 1;
        }
    }
    return searchPos;
}
function findFirstLineBreakOutsideComment(code, start = 0) {
    let commentStart, lineBreakPos;
    while (true) {
        commentStart = code.indexOf("/*", start);
        lineBreakPos = code.indexOf("\n", start);
        if (commentStart === -1) {
            break; 
        }
        if (lineBreakPos >= commentStart) {
            lineBreakPos = -1;
        } else if (lineBreakPos !== -1) {
            break;
        }
        start = code.indexOf("*/", commentStart) + 2;
    }
    return lineBreakPos;
}
export function renderStatementList(statements, code, start, end, options) {
    if (statements.length === 0) {
        return;
    }
    let currentNode, currentNodeStart, currentNodeNeedsBoundaries, nextNodeStart;
    let nextNode = statements[0];
    let nextNodeNeedsBoundaries = !nextNode.included || nextNode.needsBoundaries;
    if (nextNodeNeedsBoundaries) {
        nextNodeStart = start + findFirstLineBreakOutsideComment(code.original.slice(start, nextNode.start)) + 1;
    }
    for (let nextIndex = 1; nextIndex <= statements.length; nextIndex++) {
        currentNode = nextNode;
        currentNodeStart = nextNodeStart;
        currentNodeNeedsBoundaries = nextNodeNeedsBoundaries;
        nextNode = statements[nextIndex];
        nextNodeNeedsBoundaries = is.undefined(nextNode) ? false : !nextNode.included || nextNode.needsBoundaries;
        if (currentNodeNeedsBoundaries || nextNodeNeedsBoundaries) {
            nextNodeStart = currentNode.end + findFirstLineBreakOutsideComment(code.original.slice(currentNode.end, is.undefined(nextNode) ? end : nextNode.start)) + 1;
            if (currentNode.included) {
                currentNodeNeedsBoundaries
                    ? currentNode.render(code, options, { start: currentNodeStart, end: nextNodeStart })
                    : currentNode.render(code, options);
            } else {
                code.remove(currentNodeStart, nextNodeStart);
            }
        } else {
            currentNode.render(code, options);
        }
    }
}
// This assumes that the first character is not part of the first node
export function getCommaSeparatedNodesWithBoundaries(nodes, code, start, end) {
    const splitUpNodes = [];
    let node, nextNode, nextNodeStart, contentEnd, char;
    let separator = start - 1;
    for (let nextIndex = 0; nextIndex < nodes.length; nextIndex++) {
        nextNode = nodes[nextIndex];
        if (!is.undefined(node)) {
            separator = node.end + findFirstOccurrenceOutsideComment(code.original.slice(node.end, nextNode.start), ",");
        }
        nextNodeStart = contentEnd = separator + 2 + findFirstLineBreakOutsideComment(code.original.slice(separator + 1, nextNode.start));
        while (char = code.original.charCodeAt(nextNodeStart),
            char === 32 /*" "*/ || char === 9 /*"\t"*/ || char === 10 /*"\n"*/ || char === 13 /**
                                                                                               * "\r"
                                                                                               */) {
            nextNodeStart++;
        }
        if (!is.undefined(node)) {
            splitUpNodes.push({
                node, start, contentEnd, separator, end: nextNodeStart
            });
        }
        node = nextNode;
        start = nextNodeStart;
    }
    splitUpNodes.push({
        node, start, separator: null, contentEnd: end, end
    });
    return splitUpNodes;
}
