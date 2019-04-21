const {
    crypto: { asn1 }
} = adone;

const __ = adone.getPrivate(asn1);

/**
 * Convert number from 2^base to 2^10
 * @param {Uint8Array} inputBuffer
 * @param {number} inputBase
 * @returns {number}
 */
export const fromBase = function (inputBuffer, inputBase) {
    let result = 0;

    for (let i = inputBuffer.length - 1; i >= 0; i--) {
        result += inputBuffer[(inputBuffer.length - 1) - i] * Math.pow(2, inputBase * i);
    }

    return result;
};

/**
 * Convert number from 2^10 to 2^base
 * @param {!number} value The number to convert
 * @param {!number} base The base for 2^base
 * @param {number} [reserved=0] Pre-defined number of bytes in output array (-1 = limited by function itself)
 * @returns {ArrayBuffer}
 */
export const toBase = (value, base, reserved = 0) => {
    const internalReserved = reserved || -1;
    let internalValue = value;

    let result = 0;
    let biggest = Math.pow(2, base);

    for (let i = 1; i < 8; i++) {
        if (value < biggest) {
            let retBuf;

            if (internalReserved < 0) {
                retBuf = new ArrayBuffer(i);
                result = i;
            } else {
                if (internalReserved < i) {
                    return new ArrayBuffer(0);
                }

                retBuf = new ArrayBuffer(internalReserved);

                result = internalReserved;
            }

            const retView = new Uint8Array(retBuf);

            for (let j = i - 1; j >= 0; j--) {
                const basis = Math.pow(2, j * base);

                retView[result - j - 1] = Math.floor(internalValue / basis);
                internalValue -= retView[result - j - 1] * basis;
            }

            return retBuf;
        }

        biggest *= Math.pow(2, base);
    }

    return new ArrayBuffer(0);
};

/**
 * Concatenate two Uint8Array
 * @param {...Uint8Array} views Set of Uint8Array
 */
export const concatView = function (...views) {
    let outputLength = 0;
    let prevLength = 0;

    for (const view of views) {
        outputLength += view.length;
    }

    const retBuf = new ArrayBuffer(outputLength);
    const retView = new Uint8Array(retBuf);

    for (const view of views) {
        retView.set(view, prevLength);
        prevLength += view.length;
    }

    return retView;
};

/**
 * Concatenate two ArrayBuffers
 * @param {...ArrayBuffer} buffers Set of ArrayBuffer
 */
export const concatBuf = function (...buffers) {
    let outputLength = 0;
    let prevLength = 0;

    for (const buffer of buffers) {
        outputLength += buffer.byteLength;
    }

    const retBuf = new ArrayBuffer(outputLength);
    const retView = new Uint8Array(retBuf);

    for (const buffer of buffers) {
        retView.set(new Uint8Array(buffer), prevLength);
        prevLength += buffer.byteLength;
    }

    return retBuf;
};

/**
 * Decoding of "two complement" values
 * The function must be called in scope of instance of "hexBlock" class ("valueHex" and "warnings" properties must be present)
 * @returns {number}
 */
export const decodeTC = function () {
    const buf = new Uint8Array(this.valueHex);

    if (this.valueHex.byteLength >= 2) {
        const condition1 = (buf[0] === 0xFF) && (buf[1] & 0x80);
        const condition2 = (buf[0] === 0x00) && ((buf[1] & 0x80) === 0x00);

        if (condition1 || condition2) {
            this.warnings.push("Needlessly long format");
        }
    }

    //region Create big part of the integer
    const bigIntBuffer = new ArrayBuffer(this.valueHex.byteLength);
    const bigIntView = new Uint8Array(bigIntBuffer);
    for (let i = 0; i < this.valueHex.byteLength; i++) {
        bigIntView[i] = 0;
    }

    bigIntView[0] = buf[0] & 0x80; // mask only the biggest bit

    const bigInt = fromBase(bigIntView, 8);
    //endregion

    //region Create small part of the integer
    const smallIntBuffer = new ArrayBuffer(this.valueHex.byteLength);
    const smallIntView = new Uint8Array(smallIntBuffer);
    for (let j = 0; j < this.valueHex.byteLength; j++) {
        smallIntView[j] = buf[j];
    }

    smallIntView[0] &= 0x7F; // mask biggest bit

    const smallInt = fromBase(smallIntView, 8);
    //endregion

    return smallInt - bigInt;
};

/**
 * Encode integer value to "two complement" format
 * @param {number} value Value to encode
 * @returns {ArrayBuffer}
 */
export const encodeTC = function (value) {
    const modValue = value < 0 ? value * -1 : value;
    let bigInt = 128;

    for (let i = 1; i < 8; i++) {
        if (modValue <= bigInt) {
            if (value < 0) {
                const smallInt = bigInt - modValue;

                const retBuf = toBase(smallInt, 8, i);
                const retView = new Uint8Array(retBuf);

                retView[0] |= 0x80;

                return retBuf;
            }

            let retBuf = toBase(modValue, 8, i);
            let retView = new Uint8Array(retBuf);

            if (retView[0] & 0x80) {
                const tempBuf = retBuf.slice(0);
                const tempView = new Uint8Array(tempBuf);

                retBuf = new ArrayBuffer(retBuf.byteLength + 1);
                retView = new Uint8Array(retBuf);

                for (let k = 0; k < tempBuf.byteLength; k++) {
                    retView[k + 1] = tempView[k];
                }

                retView[0] = 0x00;
            }

            return retBuf;
        }

        bigInt *= Math.pow(2, 8);
    }

    return new ArrayBuffer(0);
};

/**
 * Get value for input parameters, or set a default value
 * @param {Object} parameters
 * @param {string} name
 * @param defaultValue
 */
export const getParametersValue = function (parameters, name, defaultValue) {
    if ((parameters instanceof Object) === false) {
        return defaultValue;
    }

    if (name in parameters) {
        return parameters[name];
    }

    return defaultValue;
};

/**
 * Pad input number with leade "0" if needed
 * @returns {string}
 * @param {number} inputNumber
 * @param {number} fullLength
 */
export const padNumber = function (inputNumber, fullLength) {
    const str = inputNumber.toString(10);
    const dif = fullLength - str.length;

    const padding = new Array(dif);
    for (let i = 0; i < dif; i++) {
        padding[i] = "0";
    }

    const paddingString = padding.join("");

    return paddingString.concat(str);
};

/**
 * Compare two array buffers
 * @param {!ArrayBuffer} inputBuffer1
 * @param {!ArrayBuffer} inputBuffer2
 * @returns {boolean}
 */
export const isEqualBuffer = function (inputBuffer1, inputBuffer2) {
    if (inputBuffer1.byteLength !== inputBuffer2.byteLength) {
        return false;
    }

    const view1 = new Uint8Array(inputBuffer1);
    const view2 = new Uint8Array(inputBuffer2);

    for (let i = 0; i < view1.length; i++) {
        if (view1[i] !== view2[i]) {
            return false;
        }
    }

    return true;
};

/**
 * Converts "ArrayBuffer" into a hexdecimal string
 * @param {ArrayBuffer} inputBuffer
 * @param {number} [inputOffset=0]
 * @param {number} [inputLength=inputBuffer.byteLength]
 * @returns {string}
 */
export const bufferToHexCodes = function (inputBuffer, inputOffset = 0, inputLength = inputBuffer.byteLength) {
    let result = "";

    for (const item of new Uint8Array(inputBuffer, inputOffset, inputLength)) {
        const str = item.toString(16).toUpperCase();
        result = result + (str.length === 1 ? "0" : "") + str;
    }

    return result;
};

/**
 * Check input "ArrayBuffer" for common functions
 * @param {LocalBaseBlock} baseBlock
 * @param {ArrayBuffer} inputBuffer
 * @param {number} inputOffset
 * @param {number} inputLength
 * @returns {boolean}
 */
export const checkBufferParams = function (baseBlock, inputBuffer, inputOffset, inputLength) {
    if ((inputBuffer instanceof ArrayBuffer) === false) {
        baseBlock.error = "Wrong parameter: inputBuffer must be \"ArrayBuffer\"";
        return false;
    }

    if (inputBuffer.byteLength === 0) {
        baseBlock.error = "Wrong parameter: inputBuffer has zero length";
        return false;
    }

    if (inputOffset < 0) {
        baseBlock.error = "Wrong parameter: inputOffset less than zero";
        return false;
    }

    if (inputLength < 0) {
        baseBlock.error = "Wrong parameter: inputLength less than zero";
        return false;
    }

    if ((inputBuffer.byteLength - inputOffset - inputLength) < 0) {
        baseBlock.error = "End of input reached before message was fully decoded (inconsistent offset and length values)";
        return false;
    }

    return true;
};

/**
 * Internal library function for decoding ASN.1 BER
 * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
 * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
 * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
 * @returns {{offset: number, result: Object}}
 */
export const LocalFromBER = function (inputBuffer, inputOffset, inputLength) {
    const incomingOffset = inputOffset; // Need to store initial offset since "inputOffset" is changing in the function

    //region Local function changing a type for ASN.1 classes
    const localChangeType = function (inputObject, newType) {
        if (inputObject instanceof newType) {
            return inputObject;
        }

        const newObject = new newType();
        newObject.idBlock = inputObject.idBlock;
        newObject.lenBlock = inputObject.lenBlock;
        newObject.warnings = inputObject.warnings;
        newObject.valueBeforeDecode = inputObject.valueBeforeDecode.slice(0);

        return newObject;
    };
    //endregion

    //region Create a basic ASN.1 type since we need to return errors and warnings from the function
    let returnObject = new asn1.BaseBlock({}, Object);
    //endregion

    //region Basic check for parameters
    if (checkBufferParams(new __.LocalBaseBlock(), inputBuffer, inputOffset, inputLength) === false) {
        returnObject.error = "Wrong input parameters";
        return {
            offset: -1,
            result: returnObject
        };
    }
    //endregion

    //region Getting Uint8Array from ArrayBuffer
    const intBuffer = new Uint8Array(inputBuffer, inputOffset, inputLength);
    //endregion

    //region Initial checks
    if (intBuffer.length === 0) {
        this.error = "Zero buffer length";
        return {
            offset: -1,
            result: returnObject
        };
    }
    //endregion

    //region Decode indentifcation block of ASN.1 BER structure
    let resultOffset = returnObject.idBlock.fromBER(inputBuffer, inputOffset, inputLength);
    returnObject.warnings.concat(returnObject.idBlock.warnings);
    if (resultOffset === -1) {
        returnObject.error = returnObject.idBlock.error;
        return {
            offset: -1,
            result: returnObject
        };
    }

    inputOffset = resultOffset;
    inputLength -= returnObject.idBlock.blockLength;
    //endregion

    //region Decode length block of ASN.1 BER structure
    resultOffset = returnObject.lenBlock.fromBER(inputBuffer, inputOffset, inputLength);
    returnObject.warnings.concat(returnObject.lenBlock.warnings);
    if (resultOffset === -1) {
        returnObject.error = returnObject.lenBlock.error;
        return {
            offset: -1,
            result: returnObject
        };
    }

    inputOffset = resultOffset;
    inputLength -= returnObject.lenBlock.blockLength;
    //endregion

    //region Check for usign indefinite length form in encoding for primitive types
    if ((returnObject.idBlock.isConstructed === false) &&
		(returnObject.lenBlock.isIndefiniteForm === true)) {
        returnObject.error = "Indefinite length form used for primitive encoding form";
        return {
            offset: -1,
            result: returnObject
        };
    }
    //endregion

    //region Switch ASN.1 block type
    let newASN1Type = asn1.BaseBlock;

    switch (returnObject.idBlock.tagClass) {
        //region UNIVERSAL
        case 1:
            //region Check for reserved tag numbers
            if ((returnObject.idBlock.tagNumber >= 37) &&
				(returnObject.idBlock.isHexOnly === false)) {
                returnObject.error = "UNIVERSAL 37 and upper tags are reserved by ASN.1 standard";
                return {
                    offset: -1,
                    result: returnObject
                };
            }
            //endregion

            switch (returnObject.idBlock.tagNumber) {
                //region EndOfContent type
                case 0:
                    //region Check for EndOfContent type
                    if ((returnObject.idBlock.isConstructed === true) &&
						(returnObject.lenBlock.length > 0)) {
                        returnObject.error = "Type [UNIVERSAL 0] is reserved";
                        return {
                            offset: -1,
                            result: returnObject
                        };
                    }
                    //endregion

                    newASN1Type = asn1.EndOfContent;

                    break;
                    //endregion
                    //region Boolean type
                case 1:
                    newASN1Type = asn1.Boolean;
                    break;
                    //endregion
                    //region Integer type
                case 2:
                    newASN1Type = asn1.Integer;
                    break;
                    //endregion
                    //region BitString type
                case 3:
                    newASN1Type = asn1.BitString;
                    break;
                    //endregion
                    //region OctetString type
                case 4:
                    newASN1Type = asn1.OctetString;
                    break;
                    //endregion
                    //region Null type
                case 5:
                    newASN1Type = asn1.Null;
                    break;
                    //endregion
                    //region OBJECT IDENTIFIER type
                case 6:
                    newASN1Type = asn1.ObjectIdentifier;
                    break;
                    //endregion
                    //region Enumerated type
                case 10:
                    newASN1Type = asn1.Enumerated;
                    break;
                    //endregion
                    //region Utf8String type
                case 12:
                    newASN1Type = asn1.Utf8String;
                    break;
                    //endregion
                    //region Time type
                case 14:
                    newASN1Type = asn1.TIME;
                    break;
                    //endregion
                    //region ASN.1 reserved type
                case 15:
                    returnObject.error = "[UNIVERSAL 15] is reserved by ASN.1 standard";
                    return {
                        offset: -1,
                        result: returnObject
                    };
                    //endregion
                    //region Sequence type
                case 16:
                    newASN1Type = asn1.Sequence;
                    break;
                    //endregion
                    //region Set type
                case 17:
                    newASN1Type = asn1.Set;
                    break;
                    //endregion
                    //region NumericString type
                case 18:
                    newASN1Type = asn1.NumericString;
                    break;
                    //endregion
                    //region PrintableString type
                case 19:
                    newASN1Type = asn1.PrintableString;
                    break;
                    //endregion
                    //region TeletexString type
                case 20:
                    newASN1Type = asn1.TeletexString;
                    break;
                    //endregion
                    //region VideotexString type
                case 21:
                    newASN1Type = asn1.VideotexString;
                    break;
                    //endregion
                    //region IA5String type
                case 22:
                    newASN1Type = asn1.IA5String;
                    break;
                    //endregion
                    //region UTCTime type
                case 23:
                    newASN1Type = asn1.UTCTime;
                    break;
                    //endregion
                    //region GeneralizedTime type
                case 24:
                    newASN1Type = asn1.GeneralizedTime;
                    break;
                    //endregion
                    //region GraphicString type
                case 25:
                    newASN1Type = asn1.GraphicString;
                    break;
                    //endregion
                    //region VisibleString type
                case 26:
                    newASN1Type = asn1.VisibleString;
                    break;
                    //endregion
                    //region GeneralString type
                case 27:
                    newASN1Type = asn1.GeneralString;
                    break;
                    //endregion
                    //region UniversalString type
                case 28:
                    newASN1Type = asn1.UniversalString;
                    break;
                    //endregion
                    //region CharacterString type
                case 29:
                    newASN1Type = asn1.CharacterString;
                    break;
                    //endregion
                    //region BmpString type
                case 30:
                    newASN1Type = asn1.BmpString;
                    break;
                    //endregion
                    //region DATE type
                case 31:
                    newASN1Type = asn1.DATE;
                    break;
                    //endregion
                    //region TimeOfDay type
                case 32:
                    newASN1Type = asn1.TimeOfDay;
                    break;
                    //endregion
                    //region Date-Time type
                case 33:
                    newASN1Type = asn1.DateTime;
                    break;
                    //endregion
                    //region Duration type
                case 34:
                    newASN1Type = asn1.Duration;
                    break;
                    //endregion
                    //region default
                default:
                {
                    let newObject;

                    if (returnObject.idBlock.isConstructed === true) {
                        newObject = new asn1.Constructed();
                    } else {
                        newObject = new asn1.Primitive();
                    }

                    newObject.idBlock = returnObject.idBlock;
                    newObject.lenBlock = returnObject.lenBlock;
                    newObject.warnings = returnObject.warnings;

                    returnObject = newObject;

                    resultOffset = returnObject.fromBER(inputBuffer, inputOffset, inputLength);
                }
				//endregion
            }
            break;
            //endregion
            //region All other tag classes
        case 2: // APPLICATION
        case 3: // CONTEXT-SPECIFIC
        case 4: // PRIVATE
        default:
            if (returnObject.idBlock.isConstructed === true) {
                newASN1Type = asn1.Constructed;
            } else {
                newASN1Type = asn1.Primitive;
            }
		//endregion
    }
    //endregion

    //region Change type and perform BER decoding
    returnObject = localChangeType(returnObject, newASN1Type);
    resultOffset = returnObject.fromBER(inputBuffer, inputOffset, returnObject.lenBlock.isIndefiniteForm === true ? inputLength : returnObject.lenBlock.length);
    //endregion

    //region Coping incoming buffer for entire ASN.1 block
    returnObject.valueBeforeDecode = inputBuffer.slice(incomingOffset, incomingOffset + returnObject.blockLength);
    //endregion

    return {
        offset: resultOffset,
        result: returnObject
    };
};
