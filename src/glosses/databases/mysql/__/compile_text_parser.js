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

const readCodeFor = (type, charset, encodingExpr, config, options) => {
    const supportBigNumbers = options.supportBigNumbers || config.supportBigNumbers;
    const bigNumberStrings = options.bigNumberStrings || config.bigNumberStrings;

    switch (type) {
        case c.type.TINY:
        case c.type.SHORT:
        case c.type.LONG:
        case c.type.INT24:
        case c.type.YEAR: {
            return "packet.parseLengthCodedIntNoBigCheck()";
        }
        case c.type.LONGLONG: {
            if (supportBigNumbers && bigNumberStrings) {
                return "packet.parseLengthCodedIntString()";
            }
            return `packet.parseLengthCodedInt(${supportBigNumbers})`;
        }
        case c.type.FLOAT:
        case c.type.DOUBLE: {
            return "packet.parseLengthCodedFloat()";
        }
        case c.type.NULL: {
            return "null; packet.skip(1)";
        }
        case c.type.DECIMAL:
        case c.type.NEWDECIMAL: {
            if (config.decimalNumbers) {
                return "packet.parseLengthCodedFloat()";
            }
            return 'packet.readLengthCodedString("ascii")';
        }
        case c.type.DATE: {
            if (config.dateStrings) {
                return 'packet.readLengthCodedString("ascii")';
            }
            return "packet.parseDate()";
        }
        case c.type.DATETIME:
        case c.type.TIMESTAMP: {
            if (config.dateStrings) {
                return 'packet.readLengthCodedString("ascii")';
            }
            return "packet.parseDateTime()";
        }
        case c.type.TIME: {
            return 'packet.readLengthCodedString("ascii")';
        }
        case c.type.GEOMETRY: {
            return "packet.parseGeometryValue()";
        }
        case c.type.JSON: {
            // Since for JSON columns mysql always returns charset 63 (BINARY),
            // we have to handle it according to JSON specs and use "utf8",
            return 'JSON.parse(packet.readLengthCodedString("utf8"))';
        }
        default: {
            if (charset === c.charset.BINARY) {
                return "packet.readLengthCodedBuffer()";
            }
            return `packet.readLengthCodedString(${encodingExpr})`;
        }
    }
};


export default function compile(fields, options, config) {
    const wrap = `(field, type, packet, encoding) => ({
        type,
        length: field.columnLength,
        db: field.schema,
        table: field.table,
        name: field.name,
        string: () => packet.readLengthCodedString(encoding),
        buffer: () => packet.readLengthCodedBuffer(),
        geometry: () => packet.parseGeometryValue()
    })`;

    // use global typeCast if current query doesn't specify one
    if (is.function(config.typeCast) && !is.function(options.typeCast)) {
        options.typeCast = config.typeCast;
    }

    let func = "(function TextRow(packet, fields, options, CharsetToEncoding) {";

    if (options.rowsAsArray) {
        func += `var result = new Array(${fields.length});`;
    }

    if (is.function(options.typeCast)) {
        func += `var wrap = ${wrap};`;
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

    for (let i = 0; i < fields.length; i++) {
        const fieldName = __.helper.srcEscape(fields[i].name);
        let lvalue = "";
        if (is.string(options.nestTables)) {
            lvalue = `this[${__.helper.srcEscape(fields[i].table + options.nestTables + fields[i].name)}]`;
        } else if (options.nestTables === true) {
            lvalue = `this[${__.helper.srcEscape(fields[i].table)}][${fieldName}]`;
        } else if (options.rowsAsArray) {
            lvalue = `result[${i.toString(10)}]`;
        } else {
            lvalue = `this[${fieldName}]`;
        }
        const encodingExpr = `CharsetToEncoding[fields[${i}].characterSet]`;
        const readCode = readCodeFor(
            fields[i].columnType,
            fields[i].characterSet,
            encodingExpr,
            config,
            options
        );
        if (is.function(options.typeCast)) {
            func += `${lvalue} = options.typeCast(wrap(fields[${i}], ${__.helper.srcEscape(typeNames[fields[i].columnType])}, packet, ${encodingExpr}), function() { return ${readCode};});`;
        } else if (options.typeCast === false) {
            func += `${lvalue} = packet.readLengthCodedBuffer();`;
        } else {
            func += `${lvalue} = ${readCode};`;
        }
    }

    if (options.rowsAsArray) {
        func += "return result;";
    }

    func += "})";

    return vm.runInThisContext(func);
}
