import nodes from "./nodes/index";
import keys from "./keys";
const newline = /\n/;

const isArrayOfNodes = (raw) => "length" in raw;

const enhanceNode = function (raw, parent, module, code, dynamicImportReturnList) {
    if (!raw) {
        return;
    }
    if (isArrayOfNodes(raw)) {
        for (let i = 0; i < raw.length; i += 1) {
            enhanceNode(raw[i], parent, module, code, dynamicImportReturnList);
        }
        return;
    }
    const rawNode = raw;
    // with e.g. shorthand properties, key and value are
    // the same node. We don't want to enhance an object twice
    if (rawNode.__enhanced) {
        return;
    }
    rawNode.__enhanced = true;
    if (!keys[rawNode.type]) {
        keys[rawNode.type] = Object.keys(rawNode).filter((key) => typeof rawNode[key] === "object");
    }
    rawNode.parent = parent;
    rawNode.module = module;
    rawNode.keys = keys[rawNode.type];
    code.addSourcemapLocation(rawNode.start);
    code.addSourcemapLocation(rawNode.end);
    for (const key of keys[rawNode.type]) {
        enhanceNode(rawNode[key], rawNode, module, code, dynamicImportReturnList);
    }
    const type = nodes[rawNode.type] || nodes.UnknownNode;
    rawNode.__proto__ = type.prototype;
    if (type === nodes.Import) {
        dynamicImportReturnList.push(rawNode);
    }
};

export default function enhance(ast, module, comments, dynamicImportReturnList) {
    enhanceNode(ast, {}, module, module.magicString, dynamicImportReturnList);
    for (const node of ast.body) {
        node.initialise(module.scope);
    }
}
