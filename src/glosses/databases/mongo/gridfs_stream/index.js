const {
    is,
    event: { EventEmitter },
    database: { mongo },
    lazify
} = adone;
const {
    utils: {
        shallowClone,
        toError
    }
} = adone.private(mongo);

const lazy = lazify({
    GridFSBucketReadStream: "./download",
    GridFSBucketWriteStream: "./upload"
}, null, require);

const DEFAULT_GRIDFS_BUCKET_OPTIONS = {
    bucketName: "fs",
    chunkSizeBytes: 255 * 1024
};

export default class GridFSBucket extends EventEmitter {
    constructor(db, options) {
        super();
        this.setMaxListeners(0);

        if (options && is.object(options)) {
            options = shallowClone(options);
            const keys = Object.keys(DEFAULT_GRIDFS_BUCKET_OPTIONS);
            for (let i = 0; i < keys.length; ++i) {
                if (!options[keys[i]]) {
                    options[keys[i]] = DEFAULT_GRIDFS_BUCKET_OPTIONS[keys[i]];
                }
            }
        } else {
            options = DEFAULT_GRIDFS_BUCKET_OPTIONS;
        }

        this.s = {
            db,
            options,
            _chunksCollection: db.collection(`${options.bucketName}.chunks`),
            _filesCollection: db.collection(`${options.bucketName}.files`),
            checkedIndexes: false,
            calledOpenUploadStream: false,
            promiseLibrary: db.s.promiseLibrary || Promise
        };
    }

    openUploadStream(filename, options) {
        if (options) {
            options = shallowClone(options);
        } else {
            options = {};
        }
        if (!options.chunkSizeBytes) {
            options.chunkSizeBytes = this.s.options.chunkSizeBytes;
        }
        return new lazy.GridFSBucketWriteStream(this, filename, options);
    }

    openUploadStreamWithId(id, filename, options) {
        if (options) {
            options = shallowClone(options);
        } else {
            options = {};
        }

        if (!options.chunkSizeBytes) {
            options.chunkSizeBytes = this.s.options.chunkSizeBytes;
        }

        options.id = id;

        return new lazy.GridFSBucketWriteStream(this, filename, options);
    }

    openDownloadStream(id, options) {
        const filter = { _id: id };
        options = {
            start: options && options.start,
            end: options && options.end
        };

        return new lazy.GridFSBucketReadStream(
            this.s._chunksCollection,
            this.s._filesCollection,
            this.s.options.readPreference,
            filter,
            options
        );
    }

    async delete(id) {
        const result = await this.s._filesCollection.deleteOne({ _id: id });
        await this.s._chunksCollection.deleteMany({ files_id: id });
        // Delete orphaned chunks before returning FileNotFound
        if (!result.result.n) {
            throw toError(`FileNotFound: no file with id ${id} found`);
        }
    }

    find(filter = {}, options = {}) {
        const cursor = this.s._filesCollection.find(filter);

        if (!is.nil(options.batchSize)) {
            cursor.batchSize(options.batchSize);
        }
        if (!is.nil(options.limit)) {
            cursor.limit(options.limit);
        }
        if (!is.nil(options.maxTimeMS)) {
            cursor.maxTimeMS(options.maxTimeMS);
        }
        if (!is.nil(options.noCursorTimeout)) {
            cursor.addCursorFlag("noCursorTimeout", options.noCursorTimeout);
        }
        if (!is.nil(options.skip)) {
            cursor.skip(options.skip);
        }
        if (!is.nil(options.sort)) {
            cursor.sort(options.sort);
        }

        return cursor;
    }

    openDownloadStreamByName(filename, options) {
        let sort = { uploadDate: -1 };
        let skip = null;
        if (options && !is.nil(options.revision)) {
            if (options.revision >= 0) {
                sort = { uploadDate: 1 };
                skip = options.revision;
            } else {
                skip = -options.revision - 1;
            }
        }

        const filter = { filename };
        options = {
            sort,
            skip,
            start: options && options.start,
            end: options && options.end
        };
        return new lazy.GridFSBucketReadStream(
            this.s._chunksCollection,
            this.s._filesCollection,
            this.s.options.readPreference,
            filter,
            options
        );
    }

    async rename(id, filename) {
        const filter = { _id: id };
        const update = { $set: { filename } };
        const result = await this.s._filesCollection.updateOne(filter, update);
        if (!result.result.n) {
            throw toError(`File with id ${id} not found`);
        }
    }

    async drop() {
        await this.s._filesCollection.drop();
        await this.s._chunksCollection.drop();
    }
}
