const {
    crypto: { asn1 }
} = adone;

const {
    Utf8String
} = asn1;

export default class TimeOfDay extends Utf8String {
    /**
	 * Constructor for "TimeOfDay" class
	 * @param {Object} [parameters={}]
	 */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 32; // TimeOfDay
    }

    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "TimeOfDay";
    }
}
