export default class CallOptions {
    static create(callOptions) {
        return new this(callOptions);
    }

    constructor({ withNew = false, args = [], callIdentifier = undefined } = {}) {
        this.withNew = withNew;
        this.args = args;
        this.callIdentifier = callIdentifier;
    }

    equals(callOptions) {
        return callOptions && this.callIdentifier === callOptions.callIdentifier;
    }
}
