const {
    crypto: { asn1 }
} = adone;

const {
    Constructed
} = asn1;

export default class Sequence extends Constructed {
    /**
	 * Constructor for "Sequence" class
	 * @param {Object} [parameters={}]
	 */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 16; // Sequence
    }

    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "Sequence";
    }
}
