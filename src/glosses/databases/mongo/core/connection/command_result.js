export default class CommandResult {
    constructor(result, connection, message) {
        this.result = result;
        this.connection = connection;
        this.message = message;
    }

    toJSON() {
        return this.result;
    }

    toString() {
        return JSON.stringify(this.toJSON());
    }
}
