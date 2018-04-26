export default class JSONParser {
    constructor(parent) {
        this.parent = parent;
        this.chunks = [];
        this.bytesWritten = 0;
    }

    write(buffer) {
        this.bytesWritten += buffer.length;
        this.chunks.push(buffer);
        return buffer.length;
    }

    end() {
        try {
            const fields = JSON.parse(Buffer.concat(this.chunks));
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
