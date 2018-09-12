export default class Hub {
    getCode() { }

    getScope() { }

    addHelper() {
        throw new Error("Helpers are not supported by the default hub.");
    }

    buildError(node, msg, Error = TypeError) {
        return new Error(msg);
    }
}
