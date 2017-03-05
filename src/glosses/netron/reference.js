import adone from "adone";

export default class Reference {
    constructor(defId) {
        this.defId = defId;
    }
}
adone.tag.set(Reference, adone.tag.NETRON_REFERENCE);
