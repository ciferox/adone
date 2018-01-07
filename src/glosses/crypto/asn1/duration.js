const {
    crypto: { asn1 }
} = adone;

const {
    Utf8String
} = asn1;

export default class Duration extends Utf8String {
    /**
     * Constructor for "Duration" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 34; // Duration
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "Duration";
    }
}
