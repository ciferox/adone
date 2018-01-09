/**
 * Javascript implementation of basic PEM (Privacy Enhanced Mail) algorithms.
 *
 * See: RFC 1421.
 */

const foldHeader = (header) => {
    let rval = `${header.name}: `;

    // ensure values with CRLF are folded
    const values = [];
    const insertSpace = function (match, $1) {
        return ` ${$1}`;
    };
    for (let i = 0; i < header.values.length; ++i) {
        values.push(header.values[i].replace(/^(\S+\r\n)/, insertSpace));
    }
    rval += `${values.join(",")}\r\n`;

    // do folding
    let length = 0;
    let candidate = -1;
    for (let i = 0; i < rval.length; ++i, ++length) {
        if (length > 65 && candidate !== -1) {
            const insert = rval[candidate];
            if (insert === ",") {
                ++candidate;
                rval = `${rval.substr(0, candidate)}\r\n ${rval.substr(candidate)}`;
            } else {
                rval = `${rval.substr(0, candidate)}\r\n${insert}${rval.substr(candidate + 1)}`;
            }
            length = (i - candidate - 1);
            candidate = -1;
            ++i;
        } else if (rval[i] === " " || rval[i] === "\t" || rval[i] === ",") {
            candidate = i;
        }
    }

    return rval;
};

const ltrim = (str) => {
    return str.replace(/^\s+/, "");
};

/**
 * Encodes (serializes) the given PEM object.
 *
 * @param msg the PEM message object to encode.
 * @param options the options to use:
 *          maxline the maximum characters per line for the body, (default: 64).
 *
 * @return the PEM-formatted string.
 */
export const encode = function (msg, options) {
    options = options || {};
    let rval = `-----BEGIN ${msg.type}-----\r\n`;

    // encode special headers
    let header;
    if (msg.procType) {
        header = {
            name: "Proc-Type",
            values: [String(msg.procType.version), msg.procType.type]
        };
        rval += foldHeader(header);
    }
    if (msg.contentDomain) {
        header = { name: "Content-Domain", values: [msg.contentDomain] };
        rval += foldHeader(header);
    }
    if (msg.dekInfo) {
        header = { name: "DEK-Info", values: [msg.dekInfo.algorithm] };
        if (msg.dekInfo.parameters) {
            header.values.push(msg.dekInfo.parameters);
        }
        rval += foldHeader(header);
    }

    if (msg.headers) {
    // encode all other headers
        for (let i = 0; i < msg.headers.length; ++i) {
            rval += foldHeader(msg.headers[i]);
        }
    }

    // terminate header
    if (msg.procType) {
        rval += "\r\n";
    }

    const body = msg.body.toString("base64");
    const maxline = options.maxline || 64;
    const lines = [];
    let i = 0;
    for (; i + maxline < body.length; i += maxline) {
        lines.push(body.slice(i, i + maxline));
    }
    lines.push(body.slice(i));

    // add body
    rval += `${lines.join("\r\n")}\r\n`;

    rval += `-----END ${msg.type}-----\r\n`;
    return rval;
};

/**
 * Decodes (deserializes) all PEM messages found in the given string.
 *
 * @param str the PEM-formatted string to decode.
 *
 * @return the PEM message objects in an array.
 */
export const decode = function (str) {
    const rval = [];

    // split string into PEM messages (be lenient w/EOF on BEGIN line)
    const rMessage = /\s*-----BEGIN ([A-Z0-9- ]+)-----\r?\n?([\x21-\x7e\s]+?(?:\r?\n\r?\n))?([:A-Za-z0-9+\/=\s]+?)-----END \1-----/g;
    const rHeader = /([\x21-\x7e]+):\s*([\x21-\x7e\s^:]+)/;
    const rCRLF = /\r?\n/;
    let match;
    while (true) {
        match = rMessage.exec(str);
        if (!match) {
            break;
        }

        const msg = {
            type: match[1],
            procType: null,
            contentDomain: null,
            dekInfo: null,
            headers: [],
            body: Buffer.from(match[3], "base64")
        };
        rval.push(msg);

        // no headers
        if (!match[2]) {
            continue;
        }

        // parse headers
        const lines = match[2].split(rCRLF);
        let li = 0;
        while (match && li < lines.length) {
            // get line, trim any rhs whitespace
            let line = lines[li].replace(/\s+$/, "");

            // RFC2822 unfold any following folded lines
            for (let nl = li + 1; nl < lines.length; ++nl) {
                const next = lines[nl];
                if (!/\s/.test(next[0])) {
                    break;
                }
                line += next;
                li = nl;
            }

            // parse header
            match = line.match(rHeader);
            if (match) {
                const header = { name: match[1], values: [] };
                const values = match[2].split(",");
                for (let vi = 0; vi < values.length; ++vi) {
                    header.values.push(ltrim(values[vi]));
                }

                // Proc-Type must be the first header
                if (!msg.procType) {
                    if (header.name !== "Proc-Type") {
                        throw new Error('Invalid PEM formatted message. The first encapsulated header must be "Proc-Type".');
                    } else if (header.values.length !== 2) {
                        throw new Error('Invalid PEM formatted message. The "Proc-Type" header must have two subfields.');
                    }
                    msg.procType = { version: values[0], type: values[1] };
                } else if (!msg.contentDomain && header.name === "Content-Domain") {
                    // special-case Content-Domain
                    msg.contentDomain = values[0] || "";
                } else if (!msg.dekInfo && header.name === "DEK-Info") {
                    // special-case DEK-Info
                    if (header.values.length === 0) {
                        throw new Error('Invalid PEM formatted message. The "DEK-Info" header must have at least one subfield.');
                    }
                    msg.dekInfo = { algorithm: values[0], parameters: values[1] || null };
                } else {
                    msg.headers.push(header);
                }
            }

            ++li;
        }

        if (msg.procType === "ENCRYPTED" && !msg.dekInfo) {
            throw new Error('Invalid PEM formatted message. The "DEK-Info" header must be present if "Proc-Type" is "ENCRYPTED".');
        }
    }

    if (rval.length === 0) {
        throw new Error("Invalid PEM formatted message.");
    }

    return rval;
};
