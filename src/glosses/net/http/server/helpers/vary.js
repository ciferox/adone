const { is, exception } = adone;

/**
 * RegExp to match field-name in RFC 7230 sec 3.2
 *
 * field-name    = token
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 */
const FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const parse = (header) => {
    let end = 0;
    const list = [];
    let start = 0;

    // gather tokens
    for (let i = 0, len = header.length; i < len; i++) {
        switch (header.charCodeAt(i)) {
            case 0x20: /*   */
                if (start === end) {
                    start = end = i + 1;
                }
                break;
            case 0x2c: /* , */
                list.push(header.substring(start, end));
                start = end = i + 1;
                break;
            default:
                end = i + 1;
                break;
        }
    }

    // final token
    list.push(header.substring(start, end));

    return list;
};

// Append a field to a vary header.
const append = (header, field) => {
    if (!is.string(header)) {
        throw new exception.InvalidArgument("header argument is required");
    }

    if (!field) {
        throw new exception.InvalidArgument("field argument is required");
    }

    // get fields array
    const fields = !is.array(field) ? parse(String(field)) : field;

    // assert on invalid field names
    for (const field of fields) {
        if (!FIELD_NAME_REGEXP.test(field)) {
            throw new exception.InvalidArgument("field argument contains an invalid header name");
        }
    }

    // existing, unspecified vary
    if (header === "*") {
        return header;
    }

    // enumerate current values
    let val = header;
    const vals = parse(header.toLowerCase());

    // unspecified vary
    if (fields.includes("*") || vals.includes("*")) {
        return "*";
    }

    for (const field of fields) {
        const fld = field.toLowerCase();

        // append value (case-preserving)
        if (!vals.includes(fld)) {
            vals.push(fld);
            val = val ? `${val}, ${field}` : field;
        }
    }

    return val;
};

// Mark that a request is varied on a header field.
const vary = (res, field) => {
    if (!res || !res.getHeader || !res.setHeader) {
        // quack quack
        throw new exception.InvalidArgument("res argument is required");
    }

    // get existing header
    let val = res.getHeader("Vary") || "";
    const header = is.array(val) ? val.join(", ") : String(val);

    // set new header
    val = append(header, field);
    if (val) {
        res.setHeader("Vary", val);
    }
};

vary.append = append;

export default vary;
