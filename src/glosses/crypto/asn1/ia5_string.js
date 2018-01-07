const {
    crypto: { asn1 }
} = adone;

const {
    LocalSimpleStringBlock
} = adone.private(asn1);

export default class IA5String extends LocalSimpleStringBlock {
    /**
     * Constructor for "IA5String" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 22; // IA5String
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "IA5String";
    }
}
