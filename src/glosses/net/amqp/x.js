export class IllegalOperationError extends adone.error.Exception {
    constructor(msg, stack) {
        super(msg);
        this.stackAtStateChange = stack;
    }
}
