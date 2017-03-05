export default class JSONParser {
    constructor(parent) {
        this.parent = parent;
        this.data = Buffer.alloc(0);
        this.bytesWritten = 0;
    }

    initWithLength(length) {
        this.data = Buffer.alloc(length);
    }

    write(buffer) {
        if (this.data.length >= this.bytesWritten + buffer.length) {
            buffer.copy(this.data, this.bytesWritten);
        } else {
            this.data = Buffer.concat([this.data, buffer]);
        }
        this.bytesWritten += buffer.length;
        return buffer.length;
    }

    end() {
        try {
            const fields = JSON.parse(this.data.toString("utf8"));
            for (const field in fields) {
                this.onField(field, fields[field]);
            }
        } catch (e) {
            this.parent.emit("error", e);
        }
        this.data = null;

        this.onEnd();
    }
}
