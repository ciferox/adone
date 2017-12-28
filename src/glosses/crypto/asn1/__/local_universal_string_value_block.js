const {
    crypto: { asn1 }
} = adone;

const {
    LocalHexBlock,
    LocalBaseBlock
} = adone.private(asn1);

export default class LocalUniversalStringValueBlock extends LocalHexBlock(LocalBaseBlock) {
    //**********************************************************************************
    /**
	 * Constructor for "LocalUniversalStringValueBlock" class
	 * @param {Object} [parameters={}]
	 */
    constructor(parameters = {}) {
        super(parameters);

        this.isHexOnly = true;
        this.value = "";
    }

    //**********************************************************************************
    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "UniversalStringValueBlock";
    }

    //**********************************************************************************
    //noinspection JSUnusedGlobalSymbols
    /**
	 * Convertion for the block to JSON object
	 * @returns {Object}
	 */
    toJSON() {
        let object = {};

        //region Seems at the moment (Sep 2016) there is no way how to check method is supported in "super" object
        try {
            object = super.toJSON();
        } catch (ex) {
            //
        }
        //endregion

        object.value = this.value;

        return object;
    }
    //**********************************************************************************
}
