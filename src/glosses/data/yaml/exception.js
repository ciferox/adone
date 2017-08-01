const { x: { Exception } } = adone;

export default class YAMLException extends Exception {
    constructor(reason, mark) {
        const message = (reason || "(unknown reason)") + (mark ? ` ${mark.toString()}` : "");
        super(message, false);
        this.reason = reason;
        this.mark = mark;
        this.message = message;
    }

    toString(compact) {
        let result = `${this.name}: `;

        result += this.reason || "(unknown reason)";

        if (!compact && this.mark) {
            result += ` ${this.mark.toString()}`;
        }

        return result;
    }
}
YAMLException.prototype.name = "YAMLException";
