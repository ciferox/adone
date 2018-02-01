const {
    is,
    exception,
    fs,
    compressor: { deflate },
    event,
    stream
} = adone;

const cp437 = '\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
const decodeBuffer = (buffer, start, end, isUtf8) => {
    if (isUtf8) {
        return buffer.toString("utf8", start, end);
    }
    let result = "";
    for (let i = start; i < end; i++) {
        result += cp437[buffer[i]];
    }
    return result;

};

const readUInt64LE = (buffer, offset) => {
    // there is no native function for this, because we can't actually store 64-bit integers precisely.
    // after 53 bits, JavaScript's Number type (IEEE 754 double) can't store individual integers anymore.
    // but since 53 bits is a whole lot more than 32 bits, we do our best anyway.
    const lower32 = buffer.readUInt32LE(offset);
    const upper32 = buffer.readUInt32LE(offset + 4);
    // we can't use bitshifting here, because JavaScript bitshifting only works on 32-bit integers.
    return upper32 * 0x100000000 + lower32;
    // as long as we're bounds checking the result of this function against the total file size,
    // we'll catch any overflow errors, because we already made sure the total file size was within reason.
};

const readAndAssertNoEof = async (reader, buffer, offset, length, position) => {
    if (length === 0) {
        // fs.read will throw an out-of-bounds error if you try to read 0 bytes from a 0 byte file
        return Buffer.alloc(0);
    }
    const bytesRead = await reader.read(buffer, offset, length, position);
    if (bytesRead < length) {
        return new exception.IllegalState("unexpected EOF");
    }
};

export const fromRandomAccessReader = async (reader, totalSize, options) => {
    if (is.nil(options)) {
        options = {};
    }
    if (is.nil(options.autoClose)) {
        options.autoClose = true;
    }
    if (is.nil(options.lazyEntries)) {
        options.lazyEntries = false;
    }
    if (is.nil(options.decodeStrings)) {
        options.decodeStrings = true;
    }
    const decodeStrings = Boolean(options.decodeStrings);
    if (is.nil(options.validateEntrySizes)) {
        options.validateEntrySizes = true;
    }
    if (!is.number(totalSize)) {
        throw new exception.InvalidArgument("expected totalSize parameter to be a number");
    }
    if (totalSize > Number.MAX_SAFE_INTEGER) {
        throw new exception.InvalidArgument("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
    }

    // the matching unref() call is in zipfile.close()
    reader.ref();

    // eocdr means End of Central Directory Record.
    // search backwards for the eocdr signature.
    // the last field of the eocdr is a variable-length comment.
    // the comment size is encoded in a 2-byte field in the eocdr, which we can't find without trudging backwards through the comment to find it.
    // as a consequence of this design decision, it's possible to have ambiguous zip file metadata if a coherent eocdr was in the comment.
    // we search backwards for a eocdr signature, and hope that whoever made the zip file was smart enough to forbid the eocdr signature in the comment.
    const eocdrWithoutCommentSize = 22;
    const maxCommentSize = 0xffff; // 2-byte size
    const bufferSize = Math.min(eocdrWithoutCommentSize + maxCommentSize, totalSize);
    const buffer = Buffer.alloc(bufferSize);
    const bufferReadStart = totalSize - buffer.length;

    await readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart);
    for (let i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
        if (buffer.readUInt32LE(i) !== 0x06054b50) {
            continue;
        }
        // found eocdr
        const eocdrBuffer = buffer.slice(i);

        // 0 - End of central directory signature = 0x06054b50
        // 4 - Number of this disk
        const diskNumber = eocdrBuffer.readUInt16LE(4);
        if (diskNumber !== 0) {
            throw new exception.NotSupported(`multi-disk zip files are not supported: found disk number: ${diskNumber}`);
        }
        // 6 - Disk where central directory starts
        // 8 - Number of central directory records on this disk
        // 10 - Total number of central directory records
        let entryCount = eocdrBuffer.readUInt16LE(10);
        // 12 - Size of central directory (bytes)
        // 16 - Offset of start of central directory, relative to start of archive
        let centralDirectoryOffset = eocdrBuffer.readUInt32LE(16);
        // 20 - Comment length
        const commentLength = eocdrBuffer.readUInt16LE(20);
        const expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize;
        if (commentLength !== expectedCommentLength) {
            throw new exception.IllegalState(`invalid comment length. expected: ${expectedCommentLength}. found: ${commentLength}`);
        }
        // 22 - Comment
        // the encoding is always cp437.
        const comment = decodeStrings
            ? decodeBuffer(eocdrBuffer, 22, eocdrBuffer.length, false)
            : eocdrBuffer.slice(22);

        if (!(entryCount === 0xffff || centralDirectoryOffset === 0xffffffff)) {
            // eslint-disable-next-line no-use-before-define
            return new ZipFile(
                reader,
                centralDirectoryOffset,
                totalSize,
                entryCount,
                comment,
                options.autoClose,
                options.lazyEntries,
                decodeStrings,
                options.validateEntrySizes
            );
        }

        // ZIP64 format

        // ZIP64 Zip64 end of central directory locator
        const zip64EocdlBuffer = Buffer.alloc(20);
        const zip64EocdlOffset = bufferReadStart + i - zip64EocdlBuffer.length;

        // eslint-disable-next-line
        await readAndAssertNoEof(reader, zip64EocdlBuffer, 0, zip64EocdlBuffer.length, zip64EocdlOffset);

        // 0 - zip64 end of central dir locator signature = 0x07064b50
        if (zip64EocdlBuffer.readUInt32LE(0) !== 0x07064b50) {
            throw new exception.IllegalState("invalid zip64 end of central directory locator signature");
        }
        // 4 - number of the disk with the start of the zip64 end of central directory
        // 8 - relative offset of the zip64 end of central directory record
        const zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8);
        // 16 - total number of disks

        // ZIP64 end of central directory record
        const zip64EocdrBuffer = Buffer.alloc(56);

        // eslint-disable-next-line
        await readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset);
        // 0 - zip64 end of central dir signature                           4 bytes  (0x06064b50)
        if (zip64EocdrBuffer.readUInt32LE(0) !== 0x06064b50) {
            throw new exception.IllegalState("invalid zip64 end of central directory record signature");
        }
        // 4 - size of zip64 end of central directory record                8 bytes
        // 12 - version made by                                             2 bytes
        // 14 - version needed to extract                                   2 bytes
        // 16 - number of this disk                                         4 bytes
        // 20 - number of the disk with the start of the central directory  4 bytes
        // 24 - total number of entries in the central directory on this disk         8 bytes
        // 32 - total number of entries in the central directory            8 bytes
        entryCount = readUInt64LE(zip64EocdrBuffer, 32);
        // 40 - size of the central directory                               8 bytes
        // 48 - offset of start of central directory with respect to the starting disk number     8 bytes
        centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48);
        // 56 - zip64 extensible data sector                                (variable size)
        // eslint-disable-next-line no-use-before-define
        return new ZipFile(
            reader,
            centralDirectoryOffset,
            totalSize,
            entryCount,
            comment,
            options.autoClose,
            options.lazyEntries,
            decodeStrings,
            options.validateEntrySizes
        );
    }
    throw new exception.IllegalState("end of central directory record signature not found");
};

export const fromFd = async (fd, options) => {
    if (is.nil(options)) {
        options = {};
    }
    if (is.nil(options.autoClose)) {
        options.autoClose = false;
    }
    if (is.nil(options.lazyEntries)) {
        options.lazyEntries = false;
    }
    if (is.nil(options.decodeStrings)) {
        options.decodeStrings = true;
    }
    if (is.nil(options.validateEntrySizes)) {
        options.validateEntrySizes = true;
    }
    const stats = await fs.fstat(fd);
    const reader = new fs.RandomAccessFdReader(fd);
    return fromRandomAccessReader(reader, stats.size, options);
};

export const open = async (path, options) => {
    if (is.nil(options)) {
        options = {};
    }
    if (is.nil(options.autoClose)) {
        options.autoClose = true;
    }
    if (is.nil(options.lazyEntries)) {
        options.lazyEntries = false;
    }
    if (is.nil(options.decodeStrings)) {
        options.decodeStrings = true;
    }
    if (is.nil(options.validateEntrySizes)) {
        options.validateEntrySizes = true;
    }
    const fd = await fs.open(path, "r");
    try {
        return fromFd(fd, options);
    } catch (err) {
        await fs.close(fd);
        throw err;
    }
};

export const fromBuffer = async (buffer, options) => {
    if (is.nil(options)) {
        options = {};
    }
    options.autoClose = false;
    if (is.nil(options.lazyEntries)) {
        options.lazyEntries = false;
    }
    if (is.nil(options.decodeStrings)) {
        options.decodeStrings = true;
    }
    if (is.nil(options.validateEntrySizes)) {
        options.validateEntrySizes = true;
    }
    const reader = new fs.RandomAccessBufferReader(buffer);
    return fromRandomAccessReader(reader, buffer.length, options);
};

const emitError = (self, err) => {
    if (self.emittedError) {
        return;
    }
    self.emittedError = true;
    self.emit("error", err);
};

const emitErrorAndAutoClose = (self, err) => {
    if (self.autoClose) {
        self.close();
    }
    emitError(self, err);
};

class Entry {
    getLastModDate() {
        return adone.datetime.dos({ date: this.lastModFileDate, time: this.lastModFileTime });
    }

    isEncrypted() {
        return (this.generalPurposeBitFlag & 0x1) !== 0;
    }

    isCompressed() {
        return this.compressionMethod === 8;
    }
}

export const validateFileName = (fileName) => {
    if (fileName.includes("\\")) {
        return `invalid characters in fileName: ${fileName}`;
    }
    if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName)) {
        return `absolute path: ${fileName}`;
    }
    if (fileName.split("/").includes("..")) {
        return `invalid relative path: ${fileName}`;
    }
    // all good
    return null;
};

class ZipFile extends event.Emitter {
    constructor(
        reader,
        centralDirectoryOffset,
        fileSize,
        entryCount,
        comment,
        autoClose,
        lazyEntries,
        decodeStrings,
        validateEntrySizes
    ) {
        super();

        this.reader = reader;
        // forward close events
        this.reader.on("error", (err) => {
            // error closing the fd
            emitError(this, err);
        });
        this.reader.once("close", () => {
            this.emit("close");
        });
        this.readEntryCursor = centralDirectoryOffset;
        this.fileSize = fileSize;
        this.entryCount = entryCount;
        this.comment = comment;
        this.entriesRead = 0;
        this.autoClose = Boolean(autoClose);
        this.lazyEntries = Boolean(lazyEntries);
        this.decodeStrings = Boolean(decodeStrings);
        this.validateEntrySizes = Boolean(validateEntrySizes);
        this.isOpen = true;
        this.emittedError = false;

        if (!this.lazyEntries) {
            setImmediate(() => this._readEntry().catch(adone.noop));
        }
    }

    async close() {
        if (!this.isOpen) {
            return;
        }
        this.isOpen = false;
        await new Promise((resolve) => {
            this.once("close", resolve);
            this.reader.unref();
        });
    }

    async readEntry() {
        if (!this.lazyEntries) {
            throw new exception.IllegalState("readEntry() called without lazyEntries:true");
        }
        return this._readEntry();
    }

    async _readEntry() {
        if (this.entryCount === this.entriesRead) {
            // done with metadata
            setImmediate(() => {
                if (this.autoClose) {
                    this.close();
                }
                if (this.emittedError) {
                    return;
                }
                this.emit("end");
            });
            return null;
        }
        if (this.emittedError) {
            return null;
        }
        let buffer = Buffer.alloc(46);

        try {
            await readAndAssertNoEof(this.reader, buffer, 0, buffer.length, this.readEntryCursor);
            const entry = new Entry();
            // 0 - Central directory file header signature
            const signature = buffer.readUInt32LE(0);
            if (signature !== 0x02014b50) {
                throw new exception.IllegalState(`invalid central directory file header signature: 0x${signature.toString(16)}`);
            }
            // 4 - Version made by
            entry.versionMadeBy = buffer.readUInt16LE(4);
            // 6 - Version needed to extract (minimum)
            entry.versionNeededToExtract = buffer.readUInt16LE(6);
            // 8 - General purpose bit flag
            entry.generalPurposeBitFlag = buffer.readUInt16LE(8);
            // 10 - Compression method
            entry.compressionMethod = buffer.readUInt16LE(10);
            // 12 - File last modification time
            entry.lastModFileTime = buffer.readUInt16LE(12);
            // 14 - File last modification date
            entry.lastModFileDate = buffer.readUInt16LE(14);
            // 16 - CRC-32
            entry.crc32 = buffer.readUInt32LE(16);
            // 20 - Compressed size
            entry.compressedSize = buffer.readUInt32LE(20);
            // 24 - Uncompressed size
            entry.uncompressedSize = buffer.readUInt32LE(24);
            // 28 - File name length (n)
            entry.fileNameLength = buffer.readUInt16LE(28);
            // 30 - Extra field length (m)
            entry.extraFieldLength = buffer.readUInt16LE(30);
            // 32 - File comment length (k)
            entry.fileCommentLength = buffer.readUInt16LE(32);
            // 34 - Disk number where file starts
            // 36 - Internal file attributes
            entry.internalFileAttributes = buffer.readUInt16LE(36);
            // 38 - External file attributes
            entry.externalFileAttributes = buffer.readUInt32LE(38);
            // 42 - Relative offset of local file header
            entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42);

            if (entry.generalPurposeBitFlag & 0x40) {
                throw new exception.NotSupported("strong encryption is not supported");
            }

            this.readEntryCursor += 46;

            buffer = Buffer.alloc(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength);
            await readAndAssertNoEof(this.reader, buffer, 0, buffer.length, this.readEntryCursor);
            // 46 - File name
            const isUtf8 = (entry.generalPurposeBitFlag & 0x800) !== 0;
            entry.fileName = this.decodeStrings ? decodeBuffer(buffer, 0, entry.fileNameLength, isUtf8)
                : buffer.slice(0, entry.fileNameLength);

            // 46+n - Extra field
            const fileCommentStart = entry.fileNameLength + entry.extraFieldLength;
            const extraFieldBuffer = buffer.slice(entry.fileNameLength, fileCommentStart);
            entry.extraFields = [];
            let i = 0;
            while (i < extraFieldBuffer.length - 3) {
                const headerId = extraFieldBuffer.readUInt16LE(i + 0);
                const dataSize = extraFieldBuffer.readUInt16LE(i + 2);
                const dataStart = i + 4;
                const dataEnd = dataStart + dataSize;
                if (dataEnd > extraFieldBuffer.length) {
                    throw new exception.IllegalState("extra field length exceeds extra field buffer size");
                }
                const dataBuffer = Buffer.alloc(dataSize);
                extraFieldBuffer.copy(dataBuffer, 0, dataStart, dataEnd);
                entry.extraFields.push({
                    id: headerId,
                    data: dataBuffer
                });
                i = dataEnd;
            }

            // 46+n+m - File comment
            entry.fileComment = this.decodeStrings
                ? decodeBuffer(buffer, fileCommentStart, fileCommentStart + entry.fileCommentLength, isUtf8)
                : buffer.slice(fileCommentStart, fileCommentStart + entry.fileCommentLength);
            // compatibility hack for https://github.com/thejoshwolfe/yauzl/issues/47
            entry.comment = entry.fileComment;

            this.readEntryCursor += buffer.length;
            this.entriesRead += 1;

            if (entry.uncompressedSize === 0xffffffff ||
                entry.compressedSize === 0xffffffff ||
                entry.relativeOffsetOfLocalHeader === 0xffffffff) {
                // ZIP64 format
                // find the Zip64 Extended Information Extra Field
                let zip64EiefBuffer = null;
                for (let i = 0; i < entry.extraFields.length; i++) {
                    const extraField = entry.extraFields[i];
                    if (extraField.id === 0x0001) {
                        zip64EiefBuffer = extraField.data;
                        break;
                    }
                }
                if (is.nil(zip64EiefBuffer)) {
                    throw new exception.IllegalState("expected zip64 extended information extra field");
                }
                let index = 0;
                // 0 - Original Size          8 bytes
                if (entry.uncompressedSize === 0xffffffff) {
                    if (index + 8 > zip64EiefBuffer.length) {
                        throw new exception.IllegalState("zip64 extended information extra field does not include uncompressed size");
                    }
                    entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index);
                    index += 8;
                }
                // 8 - Compressed Size        8 bytes
                if (entry.compressedSize === 0xffffffff) {
                    if (index + 8 > zip64EiefBuffer.length) {
                        throw new exception.IllegalState("zip64 extended information extra field does not include compressed size");
                    }
                    entry.compressedSize = readUInt64LE(zip64EiefBuffer, index);
                    index += 8;
                }
                // 16 - Relative Header Offset 8 bytes
                if (entry.relativeOffsetOfLocalHeader === 0xffffffff) {
                    if (index + 8 > zip64EiefBuffer.length) {
                        throw new exception.IllegalState("zip64 extended information extra field does not include relative header offset");
                    }
                    entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index);
                    index += 8;
                }
                // 24 - Disk Start Number      4 bytes
            }

            // check for Info-ZIP Unicode Path Extra Field (0x7075)
            // see https://github.com/thejoshwolfe/yauzl/issues/33
            if (this.decodeStrings) {
                for (let i = 0; i < entry.extraFields.length; i++) {
                    const extraField = entry.extraFields[i];
                    if (extraField.id === 0x7075) {
                        if (extraField.data.length < 6) {
                            // too short to be meaningful
                            continue;
                        }
                        // Version       1 byte      version of this extra field, currently 1
                        if (extraField.data.readUInt8(0) !== 1) {
                            // > Changes may not be backward compatible so this extra
                            // > field should not be used if the version is not recognized.
                            continue;
                        }
                        // NameCRC32     4 bytes     File Name Field CRC32 Checksum
                        const oldNameCrc32 = extraField.data.readUInt32LE(1);
                        if (adone.crypto.crc32.unsigned(buffer.slice(0, entry.fileNameLength)) !== oldNameCrc32) {
                            // > If the CRC check fails, this UTF-8 Path Extra Field should be
                            // > ignored and the File Name field in the header should be used instead.
                            continue;
                        }
                        // UnicodeName   Variable    UTF-8 version of the entry File Name
                        entry.fileName = decodeBuffer(extraField.data, 5, extraField.data.length, true);
                        break;
                    }
                }
            }

            // validate file size
            if (this.validateEntrySizes && entry.compressionMethod === 0) {
                let expectedCompressedSize = entry.uncompressedSize;
                if (entry.isEncrypted()) {
                    // traditional encryption prefixes the file data with a header
                    expectedCompressedSize += 12;
                }
                if (entry.compressedSize !== expectedCompressedSize) {
                    const msg = `compressed/uncompressed size mismatch for stored file: ${entry.compressedSize} != ${entry.uncompressedSize}`;
                    throw new exception.IllegalState(msg);
                }
            }

            if (this.decodeStrings) {
                const errorMessage = validateFileName(entry.fileName);
                if (!is.nil(errorMessage)) {
                    throw new exception.Exception(errorMessage);
                }
            }
            this.emit("entry", entry);

            if (!this.lazyEntries) {
                process.nextTick(() => this._readEntry().catch(adone.noop));
            }

            return entry;
        } catch (err) {
            emitErrorAndAutoClose(this, err);
            throw err;
        }
    }

    async openReadStream(entry, options) {
        // parameter validation
        let relativeStart = 0;
        let relativeEnd = entry.compressedSize;
        if (is.nil(options)) {
            options = {};
        } else {
            // validate options that the caller has no excuse to get wrong
            if (!is.nil(options.decrypt)) {
                if (!entry.isEncrypted()) {
                    throw new exception.InvalidArgument("options.decrypt can only be specified for encrypted entries");
                }
                if (options.decrypt !== false) {
                    throw new exception.InvalidArgument(`invalid options.decrypt value: ${options.decrypt}`);
                }
                if (entry.isCompressed()) {
                    if (options.decompress !== false) {
                        throw new exception.InvalidArgument("entry is encrypted and compressed, and options.decompress !== false");
                    }
                }
            }
            if (!is.nil(options.decompress)) {
                if (!entry.isCompressed()) {
                    throw new exception.InvalidArgument("options.decompress can only be specified for compressed entries");
                }
                if (!(options.decompress === false || options.decompress === true)) {
                    throw new exception.InvalidArgument(`invalid options.decompress value: ${options.decompress}`);
                }
            }
            if (!is.nil(options.start) || !is.nil(options.end)) {
                if (entry.isCompressed() && options.decompress !== false) {
                    throw new exception.InvalidArgument("start/end range not allowed for compressed entry without options.decompress === false");
                }
                if (entry.isEncrypted() && options.decrypt !== false) {
                    throw new exception.InvalidArgument("start/end range not allowed for encrypted entry without options.decrypt === false");
                }
            }
            if (!is.nil(options.start)) {
                relativeStart = options.start;
                if (relativeStart < 0) {
                    throw new exception.InvalidArgument("options.start < 0");
                }
                if (relativeStart > entry.compressedSize) {
                    throw new exception.InvalidArgument("options.start > entry.compressedSize");
                }
            }
            if (!is.nil(options.end)) {
                relativeEnd = options.end;
                if (relativeEnd < 0) {
                    throw new exception.InvalidArgument("options.end < 0");
                }
                if (relativeEnd > entry.compressedSize) {
                    throw new exception.InvalidArgument("options.end > entry.compressedSize");
                }
                if (relativeEnd < relativeStart) {
                    throw new exception.InvalidArgument("options.end < options.start");
                }
            }
        }
        // any further errors can either be caused by the zipfile,
        // or were introduced in a minor version of yauzl,
        // so should be passed to the client rather than thrown.
        if (!this.isOpen) {
            throw new exception.IllegalState("closed");
        }
        if (entry.isEncrypted()) {
            if (options.decrypt !== false) {
                throw new exception.InvalidArgument("entry is encrypted, and options.decrypt !== false");
            }
        }
        // make sure we don't lose the fd before we open the actual read stream
        this.reader.ref();
        const buffer = Buffer.alloc(30);
        await readAndAssertNoEof(this.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader);
        try {
            // 0 - Local file header signature = 0x04034b50
            const signature = buffer.readUInt32LE(0);
            if (signature !== 0x04034b50) {
                throw new exception.IllegalState(`invalid local file header signature: 0x${signature.toString(16)}`);
            }
            // all this should be redundant
            // 4 - Version needed to extract (minimum)
            // 6 - General purpose bit flag
            // 8 - Compression method
            // 10 - File last modification time
            // 12 - File last modification date
            // 14 - CRC-32
            // 18 - Compressed size
            // 22 - Uncompressed size
            // 26 - File name length (n)
            const fileNameLength = buffer.readUInt16LE(26);
            // 28 - Extra field length (m)
            const extraFieldLength = buffer.readUInt16LE(28);
            // 30 - File name
            // 30+n - Extra field
            const localFileHeaderEnd = entry.relativeOffsetOfLocalHeader +
                buffer.length +
                fileNameLength +
                extraFieldLength;
            let decompress;
            if (entry.compressionMethod === 0) {
                // 0 - The file is stored (no compression)
                decompress = false;
            } else if (entry.compressionMethod === 8) {
                // 8 - The file is Deflated
                decompress = !is.nil(options.decompress) ? options.decompress : true;
            } else {
                throw new exception.NotSupported(`unsupported compression method: ${entry.compressionMethod}`);
            }
            const fileDataStart = localFileHeaderEnd;
            const fileDataEnd = fileDataStart + entry.compressedSize;
            if (entry.compressedSize !== 0) {
                // bounds check now, because the read streams will probably not complain loud enough.
                // since we're dealing with an unsigned offset plus an unsigned size,
                // we only have 1 thing to check for.
                if (fileDataEnd > this.fileSize) {
                    throw new exception.IllegalState(`file data overflows file bounds: ${fileDataStart} + ${entry.compressedSize} > ${this.fileSize}`);
                }
            }
            const readStream = this.reader.createReadStream({
                start: fileDataStart + relativeStart,
                end: fileDataStart + relativeEnd
            });
            let endpointStream = readStream;
            if (decompress) {
                let destroyed = false;
                const inflateFilter = deflate.rawDecompressStream();
                readStream.on("error", (err) => {
                    // setImmediate here because errors can be emitted during the first call to pipe()
                    setImmediate(() => {
                        if (!destroyed) {
                            inflateFilter.emit("error", err);
                        }
                    });
                });
                readStream.pipe(inflateFilter);

                if (this.validateEntrySizes) {
                    endpointStream = new stream.AssertByteCountStream(entry.uncompressedSize);
                    inflateFilter.on("error", (err) => {
                        // forward zlib errors to the client-visible stream
                        setImmediate(() => {
                            if (!destroyed) {
                                endpointStream.emit("error", err);
                            }
                        });
                    });
                    inflateFilter.pipe(endpointStream);
                } else {
                    // the zlib filter is the client-visible stream
                    endpointStream = inflateFilter;
                }
                // this is part of yauzl's API, so implement this function on the client-visible stream
                endpointStream.destroy = function () {
                    destroyed = true;
                    if (inflateFilter !== endpointStream) {
                        inflateFilter.unpipe(endpointStream);
                    }
                    readStream.unpipe(inflateFilter);
                    // TODO: the inflateFilter may cause a memory leak. see Issue #27.
                    readStream.destroy();
                };
            }
            return endpointStream;
        } finally {
            this.reader.unref();
        }
    }
}
