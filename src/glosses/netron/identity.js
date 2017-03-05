import adone from "adone";
const { util: { uuid } } = adone;

export default class Identity {
    constructor(uid = uuid.v4()) {
        this.uid = uid;

    }

}
