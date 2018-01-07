const {
    crypto: { asn1 }
} = adone;

const {
    LocalSimpleStringBlock
} = adone.private(asn1);

export default class VisibleString extends LocalSimpleStringBlock {
    /**
     * Constructor for "VisibleString" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 26; // VisibleString
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "VisibleString";
    }
}
