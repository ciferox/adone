const {
    is
} = adone;

module.exports = function () {
    let buffers = []; let length = 0;

    return {
        length,
        data: this,
        add(data) {
            if (!is.buffer(data)) {
                throw new Error(`data must be a buffer, was: ${JSON.stringify(data)}`);
            }
            this.length = length = length + data.length;
            buffers.push(data);
            return this;
        },
        has(n) {
            if (is.nil(n)) {
                return length > 0;
            }
            return length >= n;
        },
        get(n) {
            let _length;
            if (is.nil(n) || n === length) {
                length = 0;
                const _buffers = buffers;
                buffers = [];
                if (_buffers.length == 1) {
                    return _buffers[0];
                }
                return Buffer.concat(_buffers);
            } else if (buffers.length > 1 && n <= (_length = buffers[0].length)) {
                const buf = buffers[0].slice(0, n);
                if (n === _length) {
                    buffers.shift();
                } else {
                    buffers[0] = buffers[0].slice(n, _length);
                }
                length -= n;
                return buf;
            } else if (n < length) {
                const out = []; let len = 0;

                while ((len + buffers[0].length) < n) {
                    const b = buffers.shift();
                    len += b.length;
                    out.push(b);
                }

                if (len < n) {
                    out.push(buffers[0].slice(0, n - len));
                    buffers[0] = buffers[0].slice(n - len, buffers[0].length);
                    this.length = length = length - n;
                }
                return Buffer.concat(out);
            } throw new Error(`could not get ${n} bytes`);
        }
    };

};





