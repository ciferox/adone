// TODO: streaming parser
const { std: { querystring } } = adone;

export default class QuerystringParser {
    constructor(maxKeys) {
        this.maxKeys = maxKeys;
        this.buffer = "";
    }

    write(buffer) {
        this.buffer += buffer.toString("ascii");
        return buffer.length;
    }

    end() {
        const fields = querystring.parse(this.buffer, "&", "=", { maxKeys: this.maxKeys });
        for (const field in fields) {
            this.onField(field, fields[field]);
        }
        this.buffer = "";

        this.onEnd();
    }
}
