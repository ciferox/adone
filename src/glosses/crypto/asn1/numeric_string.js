const {
    crypto: { asn1 }
} = adone;

const {
    LocalSimpleStringBlock
} = adone.getPrivate(asn1);

export default class NumericString extends LocalSimpleStringBlock {
    /**
     * Constructor for "NumericString" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 18; // NumericString
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "NumericString";
    }
}
