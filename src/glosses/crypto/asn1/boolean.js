const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.getPrivate(asn1);

export default class Boolean extends BaseBlock {
    /**
     * Constructor for "Boolean" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters, __.LocalBooleanValueBlock);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 1; // Boolean
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "Boolean";
    }
}
