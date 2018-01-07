const {
    crypto: { asn1 }
} = adone;

const {
    LocalSimpleStringBlock
} = adone.private(asn1);

export default class TeletexString extends LocalSimpleStringBlock {
    /**
     * Constructor for "TeletexString" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 20; // TeletexString
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "TeletexString";
    }
}
