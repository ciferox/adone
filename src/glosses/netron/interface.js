import adone from "adone";

export default class Interface {
    constructor(def, uid) {
        this.$def = def;
        this.$uid = uid;
    }
}
adone.tag.set(Interface, adone.tag.NETRON_INTERFACE);
