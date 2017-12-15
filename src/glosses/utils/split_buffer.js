const {
    is
} = adone;

const bufferIndexOf = function (buffer, search, offset, encoding) {
    if (!is.buffer(buffer)) {
        throw new adone.x.InvalidArgument("'buffer' is not a Buffer");
    }

    // allow optional offset when providing an encoding
    if (is.undefined(encoding) && is.string(offset)) {
        encoding = offset;
        offset = undefined;
    }

    if (is.string(search)) {
        search = Buffer.from(search, encoding || "utf8");
    } else if (is.number(search) && !isNaN(search)) {
        search = Buffer.from([search]);
    } else if (!is.buffer(search)) {
        throw new adone.x.InvalidArgument("'search' is not a bufferable object");
    }

    if (search.length === 0) {
        return -1;
    }

    if (is.undefined(offset) || (is.number(offset) && isNaN(offset))) {
        offset = 0;
    } else if (!is.number(offset)) {
        throw new adone.x.InvalidArgument("'offset' is not a number");
    }

    if (offset < 0) {
        offset = buffer.length + offset;
    }

    if (offset < 0) {
        offset = 0;
    }

    let m = 0;
    let s = -1;

    for (let i = offset; i < buffer.length; ++i) {
        if (buffer[i] !== search[m]) {
            s = -1;
            // <-- go back
            // match abc to aabc
            // 'aabc'
            // 'aab'
            //    ^ no match
            // a'abc'
            //   ^ set index here now and look at these again.
            //   'abc' yay!
            i -= m - 1;
            m = 0;
        }

        if (buffer[i] === search[m]) {
            if (s === -1) {
                s = i;
            }
            ++m;
            if (m === search.length) {
                break;
            }
        }
    }

    if (s > -1 && buffer.length - s < search.length) {
        return -1;
    }
    return s;
};

export default function (buf, splitBuf, includeDelim) {
    let search = -1;
    const lines = [];
    const move = includeDelim ? splitBuf.length : 0;

    while ((search = bufferIndexOf(buf, splitBuf)) > -1) {
        lines.push(buf.slice(0, search + move));
        buf = buf.slice(search + splitBuf.length, buf.length);
    }

    lines.push(buf);

    return lines;
}
