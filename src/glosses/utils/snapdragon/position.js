/**
 * Stores the position for a node
 */
export default class Position {
    constructor(start, parser) {
        this.start = start;
        this.end = { line: parser.line, column: parser.column };
    }
}
