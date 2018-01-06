class Struct {
    constructor() {
        this.schema = null;
    }
}

export default function struct(cb) {
    const s = new Struct();
    cb.call(s);
    return s;
}
