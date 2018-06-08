export const keys = {
    Program: ['body'],
    Literal: []
};
export function getAndCreateKeys(esTreeNode) {
    keys[esTreeNode.type] = Object.keys(esTreeNode).filter(key => typeof esTreeNode[key] === 'object');
    return keys[esTreeNode.type];
}
