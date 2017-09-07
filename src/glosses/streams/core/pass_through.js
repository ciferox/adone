import Transform from "./transform";

/**
 * Represents a pass through transform stream, that simply pushes the input
 */
export default class PassThrough extends Transform {
    constructor(flush) {
        super(undefined, flush);
    }

    _process(value) {
        this.push(value);
    }
}
