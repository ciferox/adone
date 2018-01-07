const {
    crypto: { asn1 }
} = adone;

const {
    LocalSimpleStringBlock
} = adone.private(asn1);

export default class GraphicString extends LocalSimpleStringBlock {
    /**
     * Constructor for "GraphicString" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 25; // GraphicString
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "GraphicString";
    }
}
