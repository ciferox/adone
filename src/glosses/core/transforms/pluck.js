import adone from "adone";

export default class extends adone.Transform {
    constructor(properties, ...args) {
        super(...args);
        this.properties = properties;
    }

    _transform(x) {
        for (const prop of this.properties) {
            if (Object.keys(x).indexOf(prop) < 0) {
                x = undefined;
                break;
            }
            x = x[prop];
        }
        this.push(x);
    }
}
