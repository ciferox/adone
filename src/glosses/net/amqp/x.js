export class IllegalOperationError extends adone.x.Exception {
    constructor(msg, stack) {
        super(msg);
        this.stackAtStateChange = stack;
    }
}
