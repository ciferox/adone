const {
    crypto: { asn1 }
} = adone;

const {
    Utf8String
} = asn1;

export default class DateTime extends Utf8String {
    /**
	 * Constructor for "DateTime" class
	 * @param {Object} [parameters={}]
	 */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 33; // DateTime
    }

    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "DateTime";
    }
}
