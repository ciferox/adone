const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.private(asn1);

export default class EndOfContent extends BaseBlock {
    constructor(paramaters = {}) {
        super(paramaters, __.LocalEndOfContentValueBlock);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 0; // EndOfContent
    }

    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "EndOfContent";
    }
}
