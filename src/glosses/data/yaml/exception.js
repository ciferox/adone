const { x: { Exception } } = adone;

export default class YAMLException extends Exception {
    constructor(reason, mark) {
        super();
        this.reason = reason;
        this.mark = mark;
        this.message = (this.reason || "(unknown reason)") +
            (this.mark ? ` ${this.mark.toString()}` : "");
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
