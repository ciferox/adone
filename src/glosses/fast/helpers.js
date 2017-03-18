// @flow



const { is, core, x, sourcemap: { Generator: SourceMapGenerator, Consumer: SourceMapConsumer }, std: { path, fs }, util } = adone;

export function applySourceMap(file, sourceMap) {
    if (is.string(sourceMap)) {
        sourceMap = JSON.parse(sourceMap);
    }

    if (file.sourceMap && is.string(file.sourceMap)) {
        file.sourceMap = JSON.parse(file.sourceMap);
    }

    if (file.sourceMap && file.sourceMap.mappings !== "") {
        var generator = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(sourceMap));
        generator.applySourceMap(new SourceMapConsumer(file.sourceMap));
        file.sourceMap = JSON.parse(generator.toString());
    } else {
        file.sourceMap = sourceMap;
    }
}

export class Concat {
    constructor(generateSourceMap, fileName, separator = Buffer.alloc(0)) {
        this.lineOffset = 0;
        this.columnOffset = 0;
        this.sourceMapping = generateSourceMap;
        this.contentParts = [];
        if (!is.buffer(separator)) {
            separator = Buffer.from(separator);
        }
        this.separator = separator;
        if (this.sourceMapping) {
            this._sourceMap = new SourceMapGenerator({ file: util.unixifyPath(fileName) });
            this.separatorLineOffset = 0;
            this.separatorColumnOffset = 0;
            const separatorString = this.separator.toString();
            for (let i = 0, n = separatorString.length; i < n; i++) {
                this.separatorColumnOffset++;
                if (separatorString[i] === "\n") {
                    this.separatorLineOffset++;
                    this.separatorColumnOffset = 0;
                }
            }
        }
    }

    add(filePath, content, sourceMap) {
        filePath = filePath && util.unixifyPath(filePath);
        if (!is.buffer(content)) {
            content = Buffer.from(content);
        }
        if (this.contentParts.length) {
            this.contentParts.push(this.separator);
        }
        this.contentParts.push(content);

        if (this.sourceMapping) {
            const contentString = content.toString();
            const lines = contentString.split("\n").length;

            if (is.string(sourceMap)) {
                sourceMap = JSON.parse(sourceMap);
            }

            if (sourceMap && sourceMap.mappings && sourceMap.mappings.length > 0) {
                const upstreamSM = new SourceMapConsumer(sourceMap);
                upstreamSM.eachMapping((mapping) => {
                    if (mapping.source) {
                        this._sourceMap.addMapping({
                            generated: {
                                line: this.lineOffset + mapping.generatedLine,
                                column: (mapping.generatedLine === 1 ? this.columnOffset : 0) + mapping.generatedColumn
                            },
                            original: {
                                line: mapping.originalLine,
                                column: mapping.originalColumn
                            },
                            source: mapping.source,
                            name: mapping.name
                        });
                    }
                });
                if (upstreamSM.sourcesContent) {
                    upstreamSM.sourcesContent.forEach((sourceContent, i) => {
                        this._sourceMap.setSourceContent(upstreamSM.sources[i], sourceContent);
                    });
                }
            } else {
                if (sourceMap && sourceMap.sources && sourceMap.sources.length > 0)
                    filePath = sourceMap.sources[0];
                if (filePath) {
                    for (let i = 1; i <= lines; i++) {
                        this._sourceMap.addMapping({
                            generated: {
                                line: this.lineOffset + i,
                                column: (i === 1 ? this.columnOffset : 0)
                            },
                            original: {
                                line: i,
                                column: 0
                            },
                            source: filePath
                        });
                    }
                    if (sourceMap && sourceMap.sourcesContent)
                        this._sourceMap.setSourceContent(filePath, sourceMap.sourcesContent[0]);
                }
            }
            if (lines > 1) {
                this.columnOffset = 0;
            }
            if (this.separatorLineOffset === 0) {
                this.columnOffset += contentString.length - Math.max(0, contentString.lastIndexOf("\n") + 1);
            }
            this.columnOffset += this.separatorColumnOffset;
            this.lineOffset += lines - 1 + this.separatorLineOffset;
        }
    }

    get content() {
        return Buffer.concat(this.contentParts);
    }

    get sourceMap() {
        return this._sourceMap ? this._sourceMap.toString() : undefined;
    }
}

function getModeDiff(fsMode, fileMode) {
    let modeDiff = 0;

    if (is.number(fileMode)) {
        modeDiff = (fileMode ^ fsMode) & 0o7777;
    }

    return modeDiff;
}

function isValidDate(str) {
    return !isNaN(Date.parse(str));
}

function getTimesDiff(fsStat, fileStat) {

    if (!isValidDate(fileStat.mtime)) {
        return;
    }

    if (+fileStat.mtime === +fsStat.mtime && +fileStat.atime === +fsStat.atime) {
        return;
    }

    let atime;
    if (isValidDate(fileStat.atime)) {
        atime = fileStat.atime;
    } else {
        atime = fsStat.atime;
    }

    if (!isValidDate(atime)) {
        atime = undefined;
    }

    return { mtime: fileStat.mtime, atime };
}

function isValidUnixId(id) {
    if (!is.number(id)) {
        return false;
    }

    if (id < 0) {
        return false;
    }

    return true;
}

function getOwnerDiff(fsStat, fileStat) {
    if (!isValidUnixId(fileStat.uid) && !isValidUnixId(fileStat.gid)) {
        return;
    }

    if ((!isValidUnixId(fsStat.uid) && !isValidUnixId(fileStat.uid)) || (!isValidUnixId(fsStat.gid) && !isValidUnixId(fileStat.gid))) {
        return;
    }

    let uid = fsStat.uid; // Default to current uid.
    if (isValidUnixId(fileStat.uid)) {
        uid = fileStat.uid;
    }

    let gid = fsStat.gid; // Default to current gid.
    if (isValidUnixId(fileStat.gid)) {
        gid = fileStat.gid;
    }

    if (uid === fsStat.uid && gid === fsStat.gid) {
        return;
    }
    return { uid, gid };
}

function isOwner(fsStat) {
    const hasGetuid = (typeof process.getuid === "function");
    const hasGeteuid = (typeof process.geteuid === "function");

    // If we don't have either, assume we don't have permissions.
    // This should only happen on Windows.
    // Windows basically noops fchmod and errors on futimes called on directories.
    if (!hasGeteuid && !hasGetuid) {
        return false;
    }

    let uid;
    if (hasGeteuid) {
        uid = process.geteuid();
    } else {
        uid = process.getuid();
    }

    if (fsStat.uid !== uid && uid !== 0) {
        return false;
    }

    return true;
}

export async function updateMetadata(fd, file) {
    const stat = await fs.fstatAsync(fd);
    const modeDiff = getModeDiff(stat.mode, file.stat.mode);
    const timesDiff = getTimesDiff(stat, file.stat);
    const ownerDiff = getOwnerDiff(stat, file.stat);
    Object.assign(file.stat, stat);
    if (!modeDiff && !timesDiff && !ownerDiff) {
        return;
    }
    if (!isOwner(stat)) {
        return;
    }
    if (modeDiff) {
        const mode = stat.mode ^ modeDiff;
        await fs.fchmodAsync(fd, mode);
        file.stat.mode = mode;

    }
    if (timesDiff) {
        await fs.futimesAsync(fd, timesDiff.atime, timesDiff.mtime);
        file.stat.atime = timesDiff.atime;
        file.stat.mtime = timesDiff.mtime;
    }
    if (ownerDiff) {
        await fs.fchownAsync(fd, ownerDiff.uid, ownerDiff.gid);
        file.stat.uid = ownerDiff.uid;
        file.stat.gid = ownerDiff.gid;
    }
}