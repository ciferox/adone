const { is, x } = adone;

export default class Binary {
    constructor(buffer, subType = 0) {
        this._bsontype = "Binary";
        if (is.number(buffer)) {
            this.subType = buffer;
            this.position = 0;
        } else {
            this.subType = subType;
            this.position = 0;
        }

        if (!is.nil(buffer) && !is.number(buffer)) {
            // Only accept Buffer, Uint8Array or Arrays
            if (is.string(buffer) || is.buffer(buffer)) {
                // Different ways of writing the length of the string for the different types
                this.buffer = Buffer.from(buffer);
            } else {
                throw new x.InvalidArgument("only String, Buffer, Uint8Array or Array accepted");
            }
            this.position = buffer.length;
        } else {
            this.buffer = Buffer.alloc(Binary.BUFFER_SIZE);
            // Set position to start of buffer
            this.position = 0;
        }
    }

    put(byteValue) {
        // If it's a string and a has more than one character throw an error
        if (!is.nil(byteValue.length) && !is.number(byteValue) && byteValue.length !== 1) {
            throw new x.InvalidArgument("only accepts single character String, Uint8Array or Array");
        }
        if (!is.number(byteValue) && byteValue < 0 || byteValue > 255) {
            throw new x.InvalidArgument("only accepts number in a valid unsigned byte range 0-255");
        }

        // Decode the byte value once
        let decodedByte = null;
        if (is.string(byteValue)) {
            decodedByte = byteValue.charCodeAt(0);
        } else if (!is.nil(byteValue.length)) {
            [decodedByte] = byteValue;
        } else {
            decodedByte = byteValue;
        }

        if (this.buffer.length > this.position) {
            this.buffer[this.position++] = decodedByte;
        } else {
            // Create additional overflow buffer
            const buffer = Buffer.alloc(Binary.BUFFER_SIZE + this.buffer.length);
            // Combine the two buffers together
            this.buffer.copy(buffer, 0, 0, this.buffer.length);
            this.buffer = buffer;
            this.buffer[this.position++] = decodedByte;
        }
    }

    write(string, offset) {
        offset = is.number(offset) ? offset : this.position;

        // If the buffer is to small let's extend the buffer
        if (this.buffer.length < offset + string.length) {
            const buffer = new Buffer(this.buffer.length + string.length);
            this.buffer.copy(buffer, 0, 0, this.buffer.length);
            this.buffer = buffer;
        }

        if (is.buffer(string)) {
            string.copy(this.buffer, offset, 0, string.length);
            this.position = (offset + string.length) > this.position
                ? (offset + string.length)
                : this.position;
        } else {
            this.buffer.write(string, offset, "binary");
            this.position = (offset + string.length) > this.position
                ? (offset + string.length)
                : this.position;
        }
    }

    read(position, length) {
        length = length && length > 0 ? length : this.position;
        return this.buffer.slice(position, position + length);
    }

    value(asRaw = false) {
        if (asRaw && this.buffer.length === this.position) {
            return this.buffer;
        }
        return asRaw ? this.buffer.slice(0, this.position) : this.buffer.toString("binary", 0, this.position);
    }

    length() {
        return this.position;
    }

    toJSON() {
        return this.buffer.toString("base64");
    }

    toString(format) {
        return this.buffer.slice(0, this.position).toString(format);
    }
}

Binary.BUFFER_SIZE = 256;
Binary.SUBTYPE_DEFAULT = 0;
Binary.SUBTYPE_FUNCTION = 1;
Binary.SUBTYPE_BYTE_ARRAY = 2;
Binary.SUBTYPE_UUID_OLD = 3;
Binary.SUBTYPE_UUID = 4;
Binary.SUBTYPE_MD5 = 5;
Binary.SUBTYPE_USER_DEFINED = 128;
