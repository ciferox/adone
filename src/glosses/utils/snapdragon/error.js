export default function (msg, node) {
    node = node || {};
    const pos = node.position || {};
    const line = (node && node.position && node.position.end && node.position.end.line) || 1;
    const column = (node && node.position && node.position.end && node.position.end.column) || 1;
    const source = this.options.source;

    const message = `${source} <line:${line} column:${column}>: ${msg}`;
    const err = new Error(message);
    err.source = source;
    err.reason = msg;
    err.pos = pos;

    if (this.options.silent) {
        this.errors.push(err);
    } else {
        throw err;
    }
};
