export class IllegalOperationError extends adone.exception.Exception {
    constructor(msg, stack) {
        super(msg);
        this.stackAtStateChange = stack;
    }
}
