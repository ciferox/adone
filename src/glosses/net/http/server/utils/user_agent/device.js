const { is } = adone;

export default class Device {
    constructor(family, brand, model, type, debug) {
        if (family && is.object(family)) {
            brand = family.brand;
            model = family.model;
            type = family.type;
            debug = family.debug;
            family = family.family;
        }
        this.family = family || "Other";
        this.brand = brand || null;
        this.model = model || null;
        if (!is.undefined(type)) {
            this.type = type || null;
        }
        if (!is.undefined(debug)) {
            this.debug = debug || null;
        }
    }

    toString() {
        let output = "";
        if (!is.null(this.brand)) {
            output += this.brand;
            if (!is.null(this.model)) {
                output += ` ${this.model}`;
            }
        } else if (this.family) {
            output = this.family;
        }
        return output;
    }
}
