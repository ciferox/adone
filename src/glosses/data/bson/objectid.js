const { is, x } = adone;

const MACHINE_ID = parseInt(Math.random() * 0xFFFFFF, 10);

const checkForHexRegExp = /^[0-9a-fA-F]{24}$/;

const hexTable = [];
for (let i = 0; i < 256; i++) {
    hexTable[i] = (i <= 15 ? "0" : "") + i.toString(16);
}

export default class ObjectID {
    constructor(id) {
        this._bsontype = "ObjectID";

        // The most common usecase (blank id, new objectId instance)
        if (is.nil(id) || is.number(id)) {
            // Generate a new id
            this.id = this.generate(id);
            // If we are caching the hex string
            if (ObjectID.cacheHexString) {
                this.__id = this.toString("hex");
            }
            // Return the object
            return;
        }

        // Check if the passed in id is valid
        const valid = ObjectID.isValid(id);

        // Throw an error if it's not a valid setup
        if (!valid && !is.nil(id)) {
            throw new x.InvalidArgument("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
        } else if (valid && is.string(id) && id.length === 24) {
            return new ObjectID(Buffer.from(id, "hex"));
        } else if (!is.nil(id) && id.length === 12) {
            // assume 12 byte string
            this.id = id;
        } else if (!is.nil(id) && id.toHexString) {
            // Duck-typing to support ObjectID from different npm packages
            return id;
        } else {
            throw new x.InvalidArgument("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
        }

        if (ObjectID.cacheHexString) {
            this.__id = this.toString("hex");
        }
    }

    toHexString() {
        if (ObjectID.cacheHexString && this.__id) {
            return this.__id;
        }

        let hexString = "";
        if (!this.id || !this.id.length) {
            throw new x.InvalidArgument(`invalid ObjectID, ObjectID.id must be either a string or a Buffer, but is [${JSON.stringify(this.id)}]`);
        }

        if (is.buffer(this.id)) {
            hexString = this.id.toString("hex");
            if (ObjectID.cacheHexString) {
                this.__id = hexString;
            }
            return hexString;
        }

        for (let i = 0; i < this.id.length; i++) {
            hexString += hexTable[this.id.charCodeAt(i)];
        }

        if (ObjectID.cacheHexString) {
            this.__id = hexString;
        }
        return hexString;
    }

    getInc() {
        return ObjectID.index = (ObjectID.index + 1) % 0xFFFFFF;
    }

    generate(time) {
        if (!is.number(time)) {
            time = ~~(Date.now() / 1000);
        }

        const pid = process.pid % 0xFFFF;
        const inc = this.getInc();
        const buffer = Buffer.alloc(12);
        // Encode time
        buffer[3] = time & 0xff;
        buffer[2] = (time >> 8) & 0xff;
        buffer[1] = (time >> 16) & 0xff;
        buffer[0] = (time >> 24) & 0xff;
        // Encode machine
        buffer[6] = MACHINE_ID & 0xff;
        buffer[5] = (MACHINE_ID >> 8) & 0xff;
        buffer[4] = (MACHINE_ID >> 16) & 0xff;
        // Encode pid
        buffer[8] = pid & 0xff;
        buffer[7] = (pid >> 8) & 0xff;
        // Encode index
        buffer[11] = inc & 0xff;
        buffer[10] = (inc >> 8) & 0xff;
        buffer[9] = (inc >> 16) & 0xff;
        // Return the buffer
        return buffer;
    }

    toString(format) {
        if (this.id && this.id.copy) {
            return this.id.toString(is.string(format) ? format : "hex");
        }

        return this.toHexString();
    }

    toJSON() {
        return this.toHexString();
    }

    equals(otherId) {
        if (otherId instanceof ObjectID) {
            return this.toString() === otherId.toString();
        }
        if (
            is.string(otherId) &&
            ObjectID.isValid(otherId) &&
            otherId.length === 12 &&
            is.buffer(this.id)
        ) {
            return otherId === this.id.toString("binary");
        }
        if (
            is.string(otherId) &&
            ObjectID.isValid(otherId) &&
            otherId.length === 24
        ) {
            return otherId.toLowerCase() === this.toHexString();
        }
        if (
            is.string(otherId) &&
            ObjectID.isValid(otherId) &&
            otherId.length === 12
        ) {
            return otherId === this.id;
        }
        if (!is.nil(otherId) && (otherId instanceof ObjectID || otherId.toHexString)) {
            return otherId.toHexString() === this.toHexString();
        }

        return false;
    }

    getTimestamp() {
        const timestamp = new Date();
        const time = this.id[3] | this.id[2] << 8 | this.id[1] << 16 | this.id[0] << 24;
        timestamp.setTime(Math.floor(time) * 1000);
        return timestamp;
    }

    createPk() {
        return new ObjectID();
    }

    static createFromTime(time) {
        const buffer = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        // Encode time into first 4 bytes
        buffer[3] = time & 0xff;
        buffer[2] = (time >> 8) & 0xff;
        buffer[1] = (time >> 16) & 0xff;
        buffer[0] = (time >> 24) & 0xff;
        // Return the new objectId
        return new ObjectID(buffer);
    }

    static createFromHexString(string) {
        // Throw an error if it's not a valid setup
        if (is.undefined(string) || !is.nil(string) && string.length !== 24) {
            throw new x.InvalidArgument("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
        }

        return new ObjectID(Buffer.from(string, "hex"));
    }

    static isValid(id) {
        if (is.nil(id)) {
            return false;
        }

        if (is.number(id)) {
            return true;
        }

        if (is.string(id)) {
            return id.length === 12 || (id.length === 24 && checkForHexRegExp.test(id));
        }

        if (id instanceof ObjectID || is.buffer(id)) {
            return true;
        }

        // Duck-Typing detection of ObjectID like objects
        if (id.toHexString) {
            return id.id.length === 12 ||
                (id.id.length === 24 && checkForHexRegExp.test(id.id));
        }

        return false;
    }

    get generationTime() {
        return this.id[3] | this.id[2] << 8 | this.id[1] << 16 | this.id[0] << 24;
    }

    set generationTime(value) {
        this.id[3] = value & 0xff;
        this.id[2] = (value >> 8) & 0xff;
        this.id[1] = (value >> 16) & 0xff;
        this.id[0] = (value >> 24) & 0xff;
    }
}



ObjectID.index = ~~(Math.random() * 0xFFFFFF);
