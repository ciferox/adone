const {
    crypto: { asn1 }
} = adone;

const {
    LocalHexBlock,
    LocalValueBlock,
    util
} = adone.getPrivate(asn1);

const powers2 = [new Uint8Array([1])];
const digitsString = "0123456789";

/**
 * @extends LocalValueBlock
 */
export default class LocalIntegerValueBlock extends LocalHexBlock(LocalValueBlock) {
    /**
     * Constructor for "LocalIntegerValueBlock" class
     * @param {Object} [parameters={}]
     * @property {ArrayBuffer} [valueHex]
     */
    constructor(parameters = {}) {
        super(parameters);

        if ("value" in parameters) {
            this.valueDec = parameters.value;
        }
    }

    /**
     * Setter for "valueHex"
     * @param {ArrayBuffer} _value
     */
    set valueHex(_value) {
        this._valueHex = _value.slice(0);

        if (_value.byteLength >= 4) {
            this.warnings.push("Too big Integer for decoding, hex only");
            this.isHexOnly = true;
            this._valueDec = 0;
        } else {
            this.isHexOnly = false;

            if (_value.byteLength > 0) {
                this._valueDec = util.decodeTC.call(this);
            }
        }
    }

    /**
     * Getter for "valueHex"
     * @returns {ArrayBuffer}
     */
    get valueHex() {
        return this._valueHex;
    }

    /**
     * Getter for "valueDec"
     * @param {number} _value
     */
    set valueDec(_value) {
        this._valueDec = _value;

        this.isHexOnly = false;
        this._valueHex = util.encodeTC(_value);
    }

    /**
     * Getter for "valueDec"
     * @returns {number}
     */
    get valueDec() {
        return this._valueDec;
    }

    /**
     * Base function for converting block from DER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 DER encoded array
     * @param {!number} inputOffset Offset in ASN.1 DER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @param {number} [expectedLength=0] Expected length of converted "valueHex" buffer
     * @returns {number} Offset after least decoded byte
     */
    fromDER(inputBuffer, inputOffset, inputLength, expectedLength = 0) {
        const offset = this.fromBER(inputBuffer, inputOffset, inputLength);
        if (offset === -1) {
            return offset;
        }

        const view = new Uint8Array(this._valueHex);

        if ((view[0] === 0x00) && ((view[1] & 0x80) !== 0)) {
            const updatedValueHex = new ArrayBuffer(this._valueHex.byteLength - 1);
            const updatedView = new Uint8Array(updatedValueHex);

            updatedView.set(new Uint8Array(this._valueHex, 1, this._valueHex.byteLength - 1));

            this._valueHex = updatedValueHex.slice(0);
        } else {
            if (expectedLength !== 0) {
                if (this._valueHex.byteLength < expectedLength) {
                    if ((expectedLength - this._valueHex.byteLength) > 1) {
                        expectedLength = this._valueHex.byteLength + 1;
                    }

                    const updatedValueHex = new ArrayBuffer(expectedLength);
                    const updatedView = new Uint8Array(updatedValueHex);

                    updatedView.set(view, expectedLength - this._valueHex.byteLength);

                    this._valueHex = updatedValueHex.slice(0);
                }
            }
        }

        return offset;
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (DER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toDER(sizeOnly = false) {
        const view = new Uint8Array(this._valueHex);

        switch (true) {
            case (view[0] & 0x80) !== 0: {
                const updatedValueHex = new ArrayBuffer(this._valueHex.byteLength + 1);
                const updatedView = new Uint8Array(updatedValueHex);

                updatedView[0] = 0x00;
                updatedView.set(view, 1);

                this._valueHex = updatedValueHex.slice(0);
                break;
            }
            case (view[0] === 0x00) && ((view[1] & 0x80) === 0): {
                const updatedValueHex = new ArrayBuffer(this._valueHex.byteLength - 1);
                const updatedView = new Uint8Array(updatedValueHex);

                updatedView.set(new Uint8Array(this._valueHex, 1, this._valueHex.byteLength - 1));

                this._valueHex = updatedValueHex.slice(0);
                break;
            }
        }

        return this.toBER(sizeOnly);
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        const resultOffset = super.fromBER(inputBuffer, inputOffset, inputLength);
        if (resultOffset === -1) {
            return resultOffset;
        }

        this.blockLength = inputLength;

        return inputOffset + inputLength;
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toBER(sizeOnly = false) {
        return this.valueHex.slice(0);
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "IntegerValueBlock";
    }

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

        object.valueDec = this.valueDec;

        return object;
    }

    /**
     * Convert current value to decimal string representation
     */
    toString() {
        //region Aux functions
        const viewAdd = (first, second) => {
            //region Initial variables
            const c = new Uint8Array([0]);

            const firstView = new Uint8Array(first);
            const secondView = new Uint8Array(second);

            let firstViewCopy = firstView.slice(0);
            const firstViewCopyLength = firstViewCopy.length - 1;
            const secondViewCopy = secondView.slice(0);
            const secondViewCopyLength = secondViewCopy.length - 1;

            let value = 0;

            const max = secondViewCopyLength < firstViewCopyLength ? firstViewCopyLength : secondViewCopyLength;

            let counter = 0;
            //endregion

            for (let i = max; i >= 0; i--, counter++) {
                switch (true) {
                    case counter < secondViewCopy.length:
                        value = firstViewCopy[firstViewCopyLength - counter] + secondViewCopy[secondViewCopyLength - counter] + c[0];
                        break;
                    default:
                        value = firstViewCopy[firstViewCopyLength - counter] + c[0];
                }

                c[0] = value / 10;

                switch (true) {
                    case counter >= firstViewCopy.length:
                        firstViewCopy = util.concatView(new Uint8Array([value % 10]), firstViewCopy);
                        break;
                    default:
                        firstViewCopy[firstViewCopyLength - counter] = value % 10;
                }
            }

            if (c[0] > 0) {
                firstViewCopy = util.concatView(c, firstViewCopy);
            }

            return firstViewCopy.slice(0);
        };

        const power2 = (n) => {
            if (n >= powers2.length) {
                for (let p = powers2.length; p <= n; p++) {
                    const c = new Uint8Array([0]);
                    let digits = powers2[p - 1].slice(0);

                    for (let i = digits.length - 1; i >= 0; i--) {
                        const newValue = new Uint8Array([(digits[i] << 1) + c[0]]);
                        c[0] = newValue[0] / 10;
                        digits[i] = newValue[0] % 10;
                    }

                    if (c[0] > 0) {
                        digits = util.concatView(c, digits);
                    }

                    powers2.push(digits);
                }
            }

            return powers2[n];
        };

        const viewSub = (first, second) => {
            //region Initial variables
            let b = 0;

            const firstView = new Uint8Array(first);
            const secondView = new Uint8Array(second);

            const firstViewCopy = firstView.slice(0);
            const firstViewCopyLength = firstViewCopy.length - 1;
            const secondViewCopy = secondView.slice(0);
            const secondViewCopyLength = secondViewCopy.length - 1;

            let value;

            let counter = 0;
            //endregion

            for (let i = secondViewCopyLength; i >= 0; i--, counter++) {
                value = firstViewCopy[firstViewCopyLength - counter] - secondViewCopy[secondViewCopyLength - counter] - b;

                switch (true) {
                    case value < 0:
                        b = 1;
                        firstViewCopy[firstViewCopyLength - counter] = value + 10;
                        break;
                    default:
                        b = 0;
                        firstViewCopy[firstViewCopyLength - counter] = value;
                }
            }

            if (b > 0) {
                for (let i = firstViewCopyLength - secondViewCopyLength + 1; i >= 0; i--, counter++) {
                    value = firstViewCopy[firstViewCopyLength - counter] - b;

                    if (value < 0) {
                        b = 1;
                        firstViewCopy[firstViewCopyLength - counter] = value + 10;
                    } else {
                        b = 0;
                        firstViewCopy[firstViewCopyLength - counter] = value;
                        break;
                    }
                }
            }

            return firstViewCopy.slice();
        };
        //endregion

        //region Initial variables
        const firstBit = (this._valueHex.byteLength * 8) - 1;

        let digits = new Uint8Array((this._valueHex.byteLength * 8) / 3);
        let bitNumber = 0;
        let currentByte;

        const asn1View = new Uint8Array(this._valueHex);

        let result = "";

        let flag = false;
        //endregion

        //region Calculate number
        for (let byteNumber = this._valueHex.byteLength - 1; byteNumber >= 0; byteNumber--) {
            currentByte = asn1View[byteNumber];

            for (let i = 0; i < 8; i++) {
                if ((currentByte & 1) === 1) {
                    switch (bitNumber) {
                        case firstBit:
                            digits = viewSub(power2(bitNumber), digits);
                            result = "-";
                            break;
                        default:
                            digits = viewAdd(digits, power2(bitNumber));
                    }
                }

                bitNumber++;
                currentByte >>= 1;
            }
        }
        //endregion

        //region Print number
        for (let i = 0; i < digits.length; i++) {
            if (digits[i]) {
                flag = true;
            }

            if (flag) {
                result += digitsString.charAt(digits[i]);
            }
        }

        if (flag === false) {
            result += digitsString.charAt(0);
        }
        //endregion

        return result;
    }
}
