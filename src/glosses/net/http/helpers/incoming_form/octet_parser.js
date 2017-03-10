
const { EventEmitter } = adone;

export default class OctetParser extends EventEmitter {
    write(buffer) {
        this.emit("data", buffer);
        return buffer.length;
    }

    end() {
        this.emit("end");
    }
}
