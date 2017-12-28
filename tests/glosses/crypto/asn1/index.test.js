describe("crypto", "asn1", () => {
    const {
        crypto: { asn1 }
    } = adone;
    const {
        Sequence,
        Integer,
        Null,
        BmpString,
        Repeated,
        Any,
        Choice,
        OctetString,
        fromBER,
        verifySchema,
        compareSchema
    } = asn1;

    it("works", () => {
        // #region How to create new ASN. structures
        const sequence = new Sequence();
        sequence.valueBlock.value.push(new Integer({ value: 1 }));

        let sequenceBuffer = sequence.toBER(false); // Encode current sequence to BER (in ArrayBuffer)
        let currentSize = sequenceBuffer.byteLength;

        const integerData = new ArrayBuffer(8);
        const integerView = new Uint8Array(integerData);
        integerView[0] = 0x01;
        integerView[1] = 0x01;
        integerView[2] = 0x01;
        integerView[3] = 0x01;
        integerView[4] = 0x01;
        integerView[5] = 0x01;
        integerView[6] = 0x01;
        integerView[7] = 0x01;

        sequence.valueBlock.value.push(new Integer({
            isHexOnly: true,
            valueHex: integerData
        })); // Put too long for decoding Integer value

        sequenceBuffer = sequence.toBER(false);
        currentSize = sequenceBuffer.byteLength;
        // #endregion

        // #region How to create new ASN.1 structures by calling constuctors with parameters
        const sequence2 = new Sequence({
            value: [
                new Integer({ value: 1 }),
                new Integer({
                    isHexOnly: true,
                    valueHex: integerData
                })
            ]
        });
        // #endregion

        // #region How to check that decoded value is too big
        let bigIntegerValue;

        const bigInteger = new Integer({
            isHexOnly: true,
            valueHex: integerData
        });

        if (bigInteger.valueBlock.isHexOnly === false) {
            bigIntegerValue = bigInteger.valueBlock.valueDec;
        } else {
            // Native integer value
            bigIntegerValue = bigInteger.valueBlock.valueHex;
        } // ArrayBuffer
        // #endregion

        // #region How to get ASN.1 structures from raw data (ASN.1 decoding)
        const encodedSequence = new ArrayBuffer(4);
        const encodedSequenceView = new Uint8Array(encodedSequence);
        encodedSequenceView[0] = 0x30;
        encodedSequenceView[1] = 0x02;
        encodedSequenceView[2] = 0x05;
        encodedSequenceView[3] = 0x00;

        const decodedAsn1 = fromBER(encodedSequence);

        expect(decodedAsn1.offset).not.to.be.equal(-1);

        let decodedSequence = decodedAsn1.result;

        const internalValue = decodedSequence.valueBlock.value[0];
        const internalValueTagNumber = internalValue.idBlock.tagNumber; // Value of "5" equal to ASN.1 Null type
        // #endregion

        // #region How to work with ASN.1 strings
        const bmpStringEncoded = new ArrayBuffer(16); // This ArrayBuffer consinsts of encoded ASN.1 BMPString with "abc_" + three first chars from Russian alphabet
        const bmpStringView = new Uint8Array(bmpStringEncoded);
        bmpStringView[0] = 0x1E;
        bmpStringView[1] = 0x0E;
        bmpStringView[2] = 0x00;
        bmpStringView[3] = 0x61;
        bmpStringView[4] = 0x00;
        bmpStringView[5] = 0x62;
        bmpStringView[6] = 0x00;
        bmpStringView[7] = 0x63;
        bmpStringView[8] = 0x00;
        bmpStringView[9] = 0x5F;
        bmpStringView[10] = 0x04;
        bmpStringView[11] = 0x30;
        bmpStringView[12] = 0x04;
        bmpStringView[13] = 0x31;
        bmpStringView[14] = 0x04;
        bmpStringView[15] = 0x32;

        const bmpStringDecoded = fromBER(bmpStringEncoded);
        expect(bmpStringDecoded.offset).not.to.be.equal(-1);

        const javascriptString1 = bmpStringDecoded.result.valueBlock.value;

        const bmpString = new BmpString({ value: "abc_абв" }); // Same with initialization by static JavaScript string
        const javascriptString2 = bmpString.valueBlock.value;
        // #endregion

        // #region How to validate ASN.1 against pre-defined schema
        const asn1Schema = new Sequence({
            name: "block1",
            value: [
                new Null({
                    name: "block2"
                }),
                new Integer({
                    name: "block3",
                    optional: true // This block is absent inside data, but it's "optional". Hence verification against the schema will be passed.
                })
            ]
        });

        const variant1 = verifySchema(encodedSequence, asn1Schema); // Verify schema together with decoding of raw data
        const variant1Verified = variant1.verified;
        const variant1Result = variant1.result; // Verified decoded data with all block names inside

        const variant1Block1 = variant1Result.block1;
        const variant1Block2 = variant1Result.block2;

        const variant2 = compareSchema(decodedSequence, decodedSequence, asn1Schema); // Compare already decoded ASN.1 against pre-defined schema
        const variant2Verified = variant2.verified;
        const variant2Result = variant2.result; // Verified decoded data with all block names inside

        const variant2Block1 = variant2Result.block1;
        const variant2Block2 = variant2Result.block2;

        const asn1SchemaAny = new Sequence({
            name: "block1",
            value: [
                new Any({ // Special type, for ASN.1 schemas only - will validate schema against any ASN.1 type
                    name: "block2"
                })
            ]
        });

        decodedSequence = fromBER(encodedSequence).result; // Re-setting "decoded_sequence"

        const variant3 = compareSchema(decodedSequence, decodedSequence, asn1SchemaAny);
        const variant3Verified = variant3.verified;

        const asn1SchemaRepeated = new Sequence({
            name: "block1",
            value: [
                new Repeated({ // Special type, for ASN.1 schemas only - will check that inside decoded data there are sequence of values with one type only
                    name: "block2_array",
                    value: new Null()
                })
            ]
        });

        decodedSequence = fromBER(encodedSequence).result; // Re-setting "decoded_sequence"

        const variant4 = compareSchema(decodedSequence, decodedSequence, asn1SchemaRepeated);
        const variant4Verified = variant4.verified;

        const variant4Array = variant4.block2_array; // Array of internal blocks

        const asn1SchemaChoice = new Sequence({
            name: "block1",
            value: [
                new Choice({ // Special type, for ASN.1 schemas only - will check ASN.1 data has one of type
                    value: [
                        new Null({
                            name: "block2"
                        }),
                        new Integer({
                            name: "block2"
                        })
                    ]
                })
            ]
        });

        decodedSequence = fromBER(encodedSequence).result; // Re-setting "decoded_sequence"

        const variant5 = compareSchema(decodedSequence, decodedSequence, asn1SchemaChoice);
        const variant5Verified = variant4.verified;
        // #endregion

        // #region How to use "internal schemas" for primitevely encoded data types
        const primitiveOctetstring = new OctetString({ valueHex: encodedSequence }); // Create a primitively encoded OctetString where internal data is an encoded Sequence

        const asn1SchemaInternal = new OctetString({
            name: "outer_block",
            primitiveSchema: new Sequence({
                name: "block1",
                value: [
                    new Null({
                        name: "block2"
                    })
                ]
            })
        });

        const variant6 = compareSchema(primitiveOctetstring, primitiveOctetstring, asn1SchemaInternal);
        const variant6Verified = variant4.verified;
        const variant6Block1TagNum = variant6.result.block1.idBlock.tagNumber;
        const variant6Block2TagNum = variant6.result.block2.idBlock.tagNumber;
    });

    const hexToArrayBuffer = (hex) => {
        const buf = Buffer.from(hex, "hex");
        const arr = new ArrayBuffer(buf.length);
        const view = new Uint8Array(arr);
        for (let i = 0; i < buf.length; ++i) {
            view[i] = buf[i];
        }
        return arr;
    };

    const arrayBufferToHex = (arr) => Buffer.from(arr).toString("hex");

    const arrayToArrayBuffer = (arr) => {
        const buf = new ArrayBuffer(arr.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < arr.length; ++i) {
            view[i] = arr[i];
        }
        return buf;
    };

    describe("ASN.1:2008 compilance suite", () => {
        describe("Common blocks", () => {

            specify("1. Too big tag number", () => {
                const data = hexToArrayBuffer("9fffffffffffffffffff7f0140");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);

                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock.warnings).to.have.lengthOf(1);
                expect(idBlock.warnings[0]).to.be.equal("Tag too long, represented as hex-coded");
                expect(idBlock.isConstructed).to.be.false();

                expect(lenBlock.isIndefiniteForm).to.be.false();
                expect(lenBlock.longFormUsed).to.be.false();
                expect(lenBlock.length).to.be.equal(1);

                const view = new Uint8Array(valueBlock.valueHex);
                expect(view[0]).to.be.equal(0x40);
            });

            specify("2. Never-ending tag number", () => {
                const data = hexToArrayBuffer("9fffffffffffffffffff");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                expect(result.error).to.be.equal("End of input reached before message was fully decoded");
            });

            specify("3. Absence of standard length block", () => {
                const data = hexToArrayBuffer("9fffffffffffffffff7f");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                expect(result.error).to.be.equal("Zero buffer length");
            });

            specify("4. 0xFF value as standard length block", () => {
                const data = hexToArrayBuffer("9fffffffffffffffff7fff");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                expect(result.error).to.be.equal("Length block 0xFF is reserved by standard");
            });

            specify("5. Unnecessary usage of long length form", () => {
                const data = hexToArrayBuffer("9fffffffffffffffff7f810140");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { lenBlock } = result;
                expect(lenBlock.warnings).to.have.lengthOf(1);
                expect(lenBlock.warnings[0]).to.be.equal("Unneccesary usage of long length form");
            });
        });

        describe("REAL", () => {
            specify.todo("6. Encoding of +0 REAL value with more then 0 octets in value block", () => {
                const data = hexToArrayBuffer("0907032b302e452d35");
                const { result, offset } = asn1.fromBER(data);
                // expect(offset).to.be.equal(-1);
                console.log(result);
            });

            specify.todo("7. Encoding of +0 REAL value with more than 0 octets in value block", () => {
                const data = hexToArrayBuffer("0907032d302e452d35");
                const { result, offset } = asn1.fromBER(data);
                console.log(result.valueBlock);
            });

            specify.todo("8. Encoding special value but value block has length more than 1", () => {
                const data = hexToArrayBuffer("0903410000");
                const { result, offset } = asn1.fromBER(data);
                console.log(result);
            });

            specify.todo("9. Bits 6 and 5 of information octet for REAL are equal to 0b11", () => {

            });

            specify.todo("10. Needlessly long encoding of exponent block for REAL type", () => {

            });

            specify.todo("11. Incorrect NR form", () => {

            });

            specify.todo("12. Encoding of special value not from ANS.1 standard", () => {

            });

            specify.todo("13. Absence of mantissa block", () => {

            });

            specify.todo("14. Absence of exponent and mantissa block", () => {

            });

            specify.todo("15. Too big value of exponent", () => {

            });

            specify.todo("16. Too big value of mantissa", () => {

            });

            specify.todo("17. Too big values for exponent and mantissa + using of scaling factor value", () => {

            });
        });

        describe("INTEGER", () => {

            specify("18. Needlessly long encoding for INTEGER value", () => {
                const data = hexToArrayBuffer("0203fff001");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock.isConstructed).to.be.false();
                expect(idBlock.tagNumber).to.be.equal(2);

                expect(lenBlock.isIndefiniteForm).to.be.false();
                expect(lenBlock.longFormUsed).to.be.false();
                expect(lenBlock.length).to.be.equal(3);

                expect(valueBlock.warnings).to.have.lengthOf(1);
                expect(valueBlock.warnings[0]).to.be.equal("Needlessly long format");
                expect(valueBlock.valueDec).to.be.equal(-4095);
            });

            specify("19. Never-ending encoding for INTEGER type", () => {
                const data = hexToArrayBuffer("0201");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                expect(result.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock.tagNumber).to.be.equal(2);
                expect(idBlock.isConstructed).to.be.false();

                expect(lenBlock.isIndefiniteForm).to.be.false();
                expect(lenBlock.longFormUsed).to.be.false();
                expect(lenBlock.length).to.be.equal(1);

                expect(valueBlock.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
            });

            specify("20. Too big integer number encoded", () => {
                const data = hexToArrayBuffer("0209800001010101010101");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock.isConstructed).to.be.false();
                expect(idBlock.tagNumber).to.be.equal(2);

                expect(lenBlock.isIndefiniteForm).to.be.false();
                expect(lenBlock.longFormUsed).to.be.false();
                expect(lenBlock.length).to.be.equal(9);

                expect(valueBlock.warnings).to.have.lengthOf(1);
                expect(valueBlock.warnings[0]).to.be.equal("Too big Integer for decoding, hex only");
                expect(valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0x80, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01]));
            });
        });

        describe("OBJECT IDENTIFIER", () => {

            specify("21. Needlessly long format of SID encoding", () => {
                const data = hexToArrayBuffer("0606808051808001");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 6
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 6
                });

                const [block1, block2] = valueBlock.value;

                expect(block1).to.include({
                    isFirstSid: true,
                    isHexOnly: false,
                    valueDec: 81
                });
                expect(block1.warnings).to.have.lengthOf(1);
                expect(block1.warnings[0]).to.be.equal("Needlessly long format of SID encoding");

                expect(block2).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 1
                });
                expect(block2.warnings).to.have.lengthOf(1);
                expect(block2.warnings[0]).to.be.equal("Needlessly long format of SID encoding");
            });

            specify("22. Too big value for SID", () => {
                const data = hexToArrayBuffer("0610ffffffffffffffffffff0f8503020203");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 6
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 16
                });

                expect(valueBlock.value).to.have.lengthOf(5);

                const [block1, block2, block3, block4, block5] = valueBlock.value;
                expect(block1).to.include({
                    isFirstSid: true,
                    isHexOnly: true
                });
                expect(block1.valueHex).to.be.deep.equal(arrayToArrayBuffer([0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0x0F]));

                expect(block2).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 643
                });

                expect(block3).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 2
                });

                expect(block4).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 2
                });

                expect(block5).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 3
                });
            });

            specify("23. Unfinished encoding of SID", () => {
                const data = hexToArrayBuffer("06117fffffffffff");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 6
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 17
                });

                expect(result.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
                expect(valueBlock.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
            });

            specify("24. Common encoding of OID", () => {
                const data = hexToArrayBuffer("0615ce608648889f4f090285eee54a85e4bf638bdb2f02");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 6
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 21
                });

                expect(valueBlock.value).to.have.lengthOf(9);
                expect(valueBlock.warnings).to.be.empty;
                expect(valueBlock.error).to.be.empty;

                const blocks = valueBlock.value[Symbol.iterator]();

                const block1 = blocks.next().value;
                expect(block1).to.include({
                    isFirstSid: true,
                    isHexOnly: false,
                    valueDec: 10080
                });

                const block2 = blocks.next().value;
                expect(block2).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 840
                });

                const block3 = blocks.next().value;
                expect(block3).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 135119
                });

                const block4 = blocks.next().value;
                expect(block4).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 9
                });

                const block5 = blocks.next().value;
                expect(block5).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 2
                });

                const block6 = blocks.next().value;
                expect(block6).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 12301002
                });

                const block7 = blocks.next().value;
                expect(block7).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 12132323
                });

                const block8 = blocks.next().value;
                expect(block8).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 191919
                });

                const block9 = blocks.next().value;
                expect(block9).to.include({
                    isFirstSid: false,
                    isHexOnly: false,
                    valueDec: 2
                });
            });
        });

        describe("BOOLEAN", () => {

            specify("25. Length of value block is more than 1 + encoding of FALSE value", () => {
                const data = hexToArrayBuffer("0103000000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 1
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 3
                });

                // TODO: must be 2 messages ?
                expect(valueBlock.warnings).to.be.deep.equal([
                    "Boolean value encoded in more then 1 octet"
                ]);
                expect(valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0, 0, 0]));
            });

            specify("26. Length of value block is more than 1 + encoding of TRUE value", () => {
                const data = hexToArrayBuffer("0103000001");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 1
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 3
                });

                // TODO: must be 2 messages ?
                expect(valueBlock.warnings).to.be.deep.equal([
                    "Boolean value encoded in more then 1 octet"
                ]);
                expect(valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0, 0, 1]));
            });

            specify("27. Absence of value block", () => {
                const data = hexToArrayBuffer("0103");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 1
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 3
                });

                expect(result.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
                expect(valueBlock.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
            });

            specify("28. Right encoding for TRUE value", () => {
                const data = hexToArrayBuffer("0101ff");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                expect(result.error).to.be.empty;
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 1
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 1
                });

                expect(valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0xFF]));
                expect(valueBlock.value).to.be.true();
            });

            specify("29. Right encoding for FALSE value", () => {
                const data = hexToArrayBuffer("010100");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                expect(result.error).to.be.empty;
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 1
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 1
                });

                expect(valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0x00]));
                expect(valueBlock.value).to.be.false();
            });
        });

        describe("NULL", () => {
            specify.todo("30. Using of value block with length more than 0 octet", () => {
                const data = hexToArrayBuffer("0503000000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                expect(result.error).to.be.empty;
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 5
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 3
                });

                expect(valueBlock.warnings).to.be.deep.equal([
                    "Non-zero length of value block for NULL type"
                ]);
            });

            specify.todo("31. Unfinished encoding of value block", () => {
                const data = hexToArrayBuffer("05030000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
            });

            specify("32. Right NULL encoding", () => {
                const data = hexToArrayBuffer("0500");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 5
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 0
                });
            });
        });

        describe("BIT STRING", () => {
            specify("33. Too big value for unused bits", () => {
                const data = hexToArrayBuffer("03020f0f");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 3
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 2
                });

                expect(result.error).to.be.equal("Unused bits for BitString must be in range 0-7");
                expect(valueBlock.error).to.be.equal("Unused bits for BitString must be in range 0-7");
            });

            specify("34. Unfinished encoding for value block", () => {
                const data = hexToArrayBuffer("030204");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 3
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 2
                });

                expect(result.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
                expect(valueBlock.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
            });

            specify("35. Using of different BIT STRING types as internal types for constructive encoding", () => {
                const data = hexToArrayBuffer("23800403000a3b0405045f291cd00000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 3
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: true,
                    longFormUsed: false,
                    length: 0
                });

                expect(result.error).to.be.equal("BIT STRING may consists of BIT STRINGs only");
                expect(valueBlock.error).to.be.equal("BIT STRING may consists of BIT STRINGs only");
            });

            specify.todo("36. Using of unused bits in internal BIT STRINGs with constructive form of encoding", () => {
                const data = hexToArrayBuffer("23802380030200010302010200000302040f0000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 3
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: true,
                    longFormUsed: false,
                    length: 0
                });

                expect(result.error).to.be.equal('Using of "unused bits" inside constructive BIT STRING allowed for least one only');
                expect(valueBlock.error).to.be.equal('Using of "unused bits" inside constructive BIT STRING allowed for least one only');
            });

            specify("37. Using of defenite form of length block in case of constructive form of encoding", () => {
                const data = hexToArrayBuffer("230c03020001030200010302040f");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 3
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 12
                });

                expect(valueBlock.value).to.have.lengthOf(3);

                const [bitString1, bitString2, bitString3] = valueBlock.value;

                expect(bitString1.idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 3
                });
                expect(bitString1.lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 2
                });
                expect(bitString1.valueBlock.unusedBits).to.be.equal(0);
                expect(bitString1.valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0x01]));

                expect(bitString2.idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 3
                });
                expect(bitString2.lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 2
                });
                expect(bitString2.valueBlock.unusedBits).to.be.equal(0);
                expect(bitString2.valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0x01]));

                expect(bitString3.idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 3
                });
                expect(bitString3.lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 2
                });
                expect(bitString3.valueBlock.unusedBits).to.be.equal(4);
                expect(bitString3.valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0x0F]));
            });

            specify("38. Using of indefinite form of length block in case of constructive form", () => {
                const data = hexToArrayBuffer("23800303000a3b0305045f291cd00000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 3
                });

                expect(lenBlock).to.include({
                    isIndefiniteForm: true,
                    longFormUsed: false,
                    length: 0
                });

                expect(valueBlock.value).to.have.lengthOf(2);

                const [bitString1, bitString2] = valueBlock.value;

                expect(bitString1.idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 3
                });
                expect(bitString1.lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 3
                });
                expect(bitString1.valueBlock.unusedBits).to.be.equal(0);
                expect(bitString1.valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0x0A, 0x3B]));

                expect(bitString2.idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 3
                });
                expect(bitString2.lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 5
                });
                expect(bitString2.valueBlock.unusedBits).to.be.equal(4);
                expect(bitString2.valueBlock.valueHex).to.be.deep.equal(arrayToArrayBuffer([0x5F, 0x29, 0x1C, 0xD0]));
            });

            specify("39. Using of constructive form of encoding for empty BIT STRING", () => {
                const data = hexToArrayBuffer("2300");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 3
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 0
                });
            });

            specify("40. Encoding of empty BIT STRING", () => {
                const data = hexToArrayBuffer("0300");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 3
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 0
                });
            });
        });

        describe("OCTET STRING", () => {
            specify("41. Using of different form OCTET STRING types as internal types for constructive encoding", () => {
                const data = hexToArrayBuffer("24800303000a3b0305045f291cd00000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 4
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: true,
                    longFormUsed: false,
                    length: 0
                });
                expect(result.error).to.be.equal("OCTET STRING may consists of OCTET STRINGs only");
                expect(valueBlock.error).to.be.equal("OCTET STRING may consists of OCTET STRINGs only");
            });

            specify("42. Unfinished encoding for value block in case of primitive form of encoding", () => {
                const data = hexToArrayBuffer("24800403000405045f291cd00000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 4
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: true,
                    longFormUsed: false,
                    length: 0
                });
                expect(result.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
                expect(valueBlock.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
            });

            specify("43. Unfinished encoding for value block in case of primitive form of encoding", () => {
                const data = hexToArrayBuffer("2403");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 4
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 3
                });
                expect(result.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
                expect(valueBlock.error).to.be.equal("End of input reached before message was fully decoded (inconsistent offset and length values)");
            });

            specify("44. Encoding of empty OCTET STRING", () => {
                const data = hexToArrayBuffer("0400");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 4
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 0
                });
            });

            specify("45. Using of constructive form of encoding for empty OCTET STRING", () => {
                const data = hexToArrayBuffer("2400");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).not.to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 4
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 0
                });
            });
        });

        describe("BIT STRING", () => {
            specify("46. Using of indefinite length in case of primitive form of encoding", () => {
                const data = hexToArrayBuffer("0380040a3b5f291cd00000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: false,
                    tagNumber: 3
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: true,
                    longFormUsed: false,
                    length: 0
                });
                expect(result.error).to.be.equal("Indefinite length form used for primitive encoding form");
            });

            specify("47. Using of definite form of length encoding, but use EOC as one of internal string", () => {
                const data = hexToArrayBuffer("230e030200010000030200010302040f");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 3
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: false,
                    longFormUsed: false,
                    length: 14
                });
                expect(result.error).to.be.equal("EndOfContent is unexpected, BIT STRING may consists of BIT STRINGs only");
                expect(valueBlock.error).to.be.equal("EndOfContent is unexpected, BIT STRING may consists of BIT STRINGs only");
            });

            specify("48. Using of more than 7 unused bits in BIT STRING with constructive encoding form", () => {
                const data = hexToArrayBuffer("2380030200010302000103020f0f0000");
                const { result, offset } = asn1.fromBER(data);
                expect(offset).to.be.equal(-1);
                const { idBlock, lenBlock, valueBlock } = result;

                expect(idBlock).to.include({
                    isConstructed: true,
                    tagNumber: 3
                });
                expect(lenBlock).to.include({
                    isIndefiniteForm: true,
                    longFormUsed: false,
                    length: 0
                });
                expect(result.error).to.be.equal("Unused bits for BitString must be in range 0-7");
                expect(valueBlock.error).to.be.equal("Unused bits for BitString must be in range 0-7");
            });
        });
    });
});
