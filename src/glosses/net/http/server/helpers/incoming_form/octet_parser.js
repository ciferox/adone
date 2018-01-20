export default class OctetParser extends adone.event.Emitter {
    write(buffer) {
        this.emit("data", buffer);
        return buffer.length;
    }

    end() {
        this.emit("end");
    }
}
