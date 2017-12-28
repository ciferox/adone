const {
    crypto: { asn1 }
} = adone;

const {
    LocalPrimitiveValueBlock
} = adone.private(asn1);

const {
    BaseBlock
} = asn1;

export default class Primitive extends BaseBlock {
    /**
	 * Constructor for "Primitive" class
	 * @param {Object} [parameters={}]
	 * @property {ArrayBuffer} [valueHex]
	 */
    constructor(parameters = {}) {
        super(parameters, LocalPrimitiveValueBlock);

        this.idBlock.isConstructed = false;
    }

    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "PRIMITIVE";
    }

}
