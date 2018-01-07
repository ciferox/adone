const {
    crypto: { asn1 }
} = adone;

const {
    Integer
} = asn1;

export default class Enumerated extends Integer {
    /**
     * Constructor for "Enumerated" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 10; // Enumerated
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "Enumerated";
    }
}
