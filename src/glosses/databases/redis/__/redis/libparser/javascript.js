const {
    is
} = adone;

export default class JavaScriptReplyParser {
    constructor(options) {
        this.name = "javascript";
        this.buffer = Buffer.alloc(0);
        this.offset = 0;
        this.bigStrSize = 0;
        this.chunksSize = 0;
        this.buffers = [];
        this.type = 0;
        this.protocolError = false;
        this.offsetCache = 0;
        // If returnBuffers is active, all return values are returned as buffers besides numbers and errors
        if (options.return_buffers) {
            this.handleReply = (start, end) => this.buffer.slice(start, end);
        } else {
            this.handleReply = (start, end) => this.buffer.toString("utf-8", start, end);
        }
        // If stringNumbers is activated the parser always returns numbers as string
        // This is important for big numbers (number > Math.pow(2, 53)) as js numbers
        // are 64bit floating point numbers with reduced precision
        if (options.string_numbers) {
            this.handleNumbers = (start, end) => this.buffer.toString("ascii", start, end);
        } else {
            this.handleNumbers = (start, end) => Number(this.buffer.toString("ascii", start, end));
        }
    }

    parseResult(type) {
        if (type === 36) { // $
            const packetHeader = this.parseHeader();
            // Packets with a size of -1 are considered null
            if (packetHeader === -1) {
                return null;
            }
            const start = this.offset;
            const end = this.offset + packetHeader;
            if (end + 2 > this.buffer.length) {
                if (this.offsetCache === 0) {
                    this.buffers.push(this.buffer);
                } else {
                    this.buffers.push(this.buffer.slice(this.offsetCache));
                }
                this.chunksSize = this.buffers[0].length;
                // Include the packetHeader delimiter
                this.bigStrSize = packetHeader + 2;
                throw new Error("Wait for more data.");
            }
            // Set the offset to after the delimiter
            this.offset = end + 2;
            return this.handleReply(start, end);
        }
        if (type === 58) { // :
            // Up to the delimiter
            const start = this.offset;
            const end = this.packetEndOffset();
            // Include the delimiter
            this.offset = end + 2;
            // Return the coerced numeric value
            return this.handleNumbers(start, end);
        }
        if (type === 43) { // +
            const start = this.offset;
            const end = this.packetEndOffset();
            this.offset = end + 2;
            return this.handleReply(start, end);
        }
        if (type === 42) { // *
            const packetHeader = this.parseHeader();
            if (packetHeader === -1) {
                return null;
            }
            const reply = [];
            for (let i = 0; i < packetHeader; i++) {
                if (this.offset >= this.buffer.length) {
                    throw new Error("Wait for more data.");
                }
                reply.push(this.parseResult(this.buffer[this.offset++]));
            }
            return reply;
        }
        if (type === 45) { // -
            const start = this.offset;
            const end = this.packetEndOffset();
            this.offset = end + 2;
            return new Error(this.buffer.toString("utf-8", start, end));
        }
    }

    execute(buffer) {
        if (this.chunksSize !== 0) {
            if (this.bigStrSize > this.chunksSize + buffer.length) {
                this.buffers.push(buffer);
                this.chunksSize += buffer.length;
                return;
            }
            this.buffers.push(buffer);
            this.buffer = Buffer.concat(this.buffers, this.chunksSize + buffer.length);
            this.buffers = [];
            this.bigStrSize = 0;
            this.chunksSize = 0;
        } else if (this.offset >= this.buffer.length) {
            this.buffer = buffer;
        } else {
            this.buffer = Buffer.concat([this.buffer.slice(this.offset), buffer]);
        }
        this.offset = 0;
        this.run();
    }

    tryParsing() {
        try {
            return this.parseResult(this.type);
        } catch (err) {
            // Catch the error (not enough data), rewind if it's an array,
            // and wait for the next packet to appear
            this.offset = this.offsetCache;
            // Indicate that there's no protocol error by resetting the type too
            this.type = undefined;
        }
    }

    run() {
        // Set a rewind point. If a failure occurs, wait for the next execute()/append() and try again
        this.offsetCache = this.offset;
        this.type = this.buffer[this.offset++];
        let reply = this.tryParsing();

        while (!is.undefined(reply)) {
            if (this.type === 45) { // Errors -
                this.returnError(reply);
            } else {
                this.returnReply(reply); // Strings + // Integers : // Bulk strings $ // Arrays *
            }
            this.offsetCache = this.offset;
            this.type = this.buffer[this.offset++];
            reply = this.tryParsing();
        }
        if (!is.undefined(this.type)) {
            // Reset the buffer so the parser can handle following commands properly
            this.buffer = Buffer.alloc(0);
            this.returnFatalError(new Error(`Protocol error, got ${JSON.stringify(String.fromCharCode(this.type))} as reply type byte`));
        }
    }

    parseHeader() {
        const end = this.packetEndOffset();
        const value = this.buffer.toString("ascii", this.offset, end) | 0;
        this.offset = end + 2;
        return value;
    }

    packetEndOffset() {
        let offset = this.offset;
        const len = this.buffer.length - 1;

        while (this.buffer[offset] !== 0x0d && this.buffer[offset + 1] !== 0x0a) {
            offset++;

            if (offset >= len) {
                throw new Error(`Did not see LF after NL reading multi bulk count (${offset} => ${this.buffer.length}, ${this.offset})`);
            }
        }
        return offset;
    }
}
