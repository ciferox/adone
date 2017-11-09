const {
    is,
    database: { mysql },
    std: { vm }
} = adone;

const {
    c
} = mysql;

const __ = adone.private(mysql);

const typeNames = [];
for (const t in c.type) {
    typeNames[c.type[t]] = t;
}

const readCodeFor = (field, config, options, fieldNum) => {
    const supportBigNumbers = options.supportBigNumbers || config.supportBigNumbers;
    const bigNumberStrings = options.bigNumberStrings || config.bigNumberStrings;
    const unsigned = field.flags & c.fieldFlag.UNSIGNED;
    switch (field.columnType) {
        case c.type.TINY: {
            return unsigned ? "packet.readInt8();" : "packet.readSInt8();";
        }
        case c.type.SHORT: {
            return unsigned ? "packet.readInt16();" : "packet.readSInt16();";
        }
        case c.type.LONG:
        case c.type.INT24: { // in binary protocol int24 is encoded in 4 bytes int32
            return unsigned ? "packet.readInt32();" : "packet.readSInt32();";
        }
        case c.type.YEAR: {
            return "packet.readInt16()";
        }
        case c.type.FLOAT: {
            return "packet.readFloat();";
        }
        case c.type.DOUBLE: {
            return "packet.readDouble();";
        }
        case c.type.NULL: {
            return "null;";
        }
        case c.type.DATE:
        case c.type.DATETIME:
        case c.type.TIMESTAMP:
        case c.type.NEWDATE: {
            if (config.dateStrings) {
                return `packet.readDateTimeString(${field.decimals});`;
            }
            return "packet.readDateTime();";
        }
        case c.type.TIME: {
            return "packet.readTimeString()";
        }
        case c.type.DECIMAL:
        case c.type.NEWDECIMAL: {
            if (config.decimalNumbers) {
                return "packet.parseLengthCodedFloat();";
            }
            return 'packet.readLengthCodedString("ascii");';
        }
        case c.type.GEOMETRY: {
            return "packet.parseGeometryValue();";
        }
        case c.type.JSON: {
            // Since for JSON columns mysql always returns charset 63 (BINARY),
            // we have to handle it according to JSON specs and use "utf8",
            return 'JSON.parse(packet.readLengthCodedString("utf8"));';
        }
        case c.type.LONGLONG: {
            if (!supportBigNumbers) {
                return unsigned ? "packet.readInt64JSNumber();" : "packet.readSInt64JSNumber();";
            }
            if (bigNumberStrings) {
                return unsigned ? "packet.readInt64String();" : "packet.readSInt64String();";
            }
            return unsigned ? "packet.readInt64();" : "packet.readSInt64();";
        }
        default: {
            if (field.characterSet === c.charset.BINARY) {
                return "packet.readLengthCodedBuffer();";
            }
            return `packet.readLengthCodedString(CharsetToEncoding[fields[${fieldNum}].characterSet])`;
        }
    }
};

export default function compile(fields, options, config) {
    const nullBitmapLength = Math.floor((fields.length + 7 + 2) / 8);

    let func = "(function BinaryRow(packet, fields, options, CharsetToEncoding) {";

    if (options.rowsAsArray) {
        func += `var result = new Array(${fields.length});`;
    }

    const resultTables = {};
    let resultTablesArray = [];

    if (options.nestTables === true) {
        for (let i = 0; i < fields.length; i++) {
            resultTables[fields[i].table] = 1;
        }
        resultTablesArray = Object.keys(resultTables);
        for (let i = 0; i < resultTablesArray.length; i++) {
            func += `this[${__.helper.srcEscape(resultTablesArray[i])}] = {};`;
        }
    }

    func += "var statusByte = packet.readInt8();";
    for (let i = 0; i < nullBitmapLength; ++i) {
        func += `var nullBitmaskByte${i} = packet.readInt8();`;
    }

    let lvalue = "";
    let currentFieldNullBit = 4;
    let nullByteIndex = 0;
    let tableName = "";

    for (let i = 0; i < fields.length; i++) {
        const fieldName = __.helper.srcEscape(fields[i].name);

        if (is.string(options.nestTables)) {
            tableName = __.helper.srcEscape(fields[i].table);
            lvalue = `this[${__.helper.srcEscape(fields[i].table + options.nestTables + fields[i].name)}]`;
        } else if (options.nestTables === true) {
            tableName = __.helper.srcEscape(fields[i].table);
            lvalue = `this[${tableName}][${fieldName}]`;
        } else if (options.rowsAsArray) {
            lvalue = `result[${i.toString(10)}]`;
        } else {
            lvalue = `this[${__.helper.srcEscape(fields[i].name)}]`;
        }

        // TODO: this used to be an optimisation ( if column marked as NOT_NULL don't include code to check null
        // bitmap at all, but it seems that we can't rely on this flag, see #178
        // TODO: benchmark performance difference
        func += `if (nullBitmaskByte${nullByteIndex} & ${currentFieldNullBit}) {`;
        func += `${lvalue} = null;`;
        func += "} else {";
        func += `${lvalue} = ${readCodeFor(fields[i], config, options, i)}; }`;
        currentFieldNullBit *= 2;
        if (currentFieldNullBit === 0x100) {
            currentFieldNullBit = 1;
            nullByteIndex++;
        }
    }

    if (options.rowsAsArray) {
        func += "return result;";
    }

    func += "})";

    return vm.runInThisContext(func);
}
