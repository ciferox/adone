const native = adone.nativeAddon("git.node");

const {
    promise: { promisifyAll }
} = adone;

const Note = native.Note;

Note.create = promisifyAll(Note.create);
Note.iteratorNew = promisifyAll(Note.iteratorNew);
Note.read = promisifyAll(Note.read);
Note.remove = promisifyAll(Note.remove);

const asyncForeach = promisifyAll(Note.foreach);

// Override Note.foreach to eliminate the need to pass null payload
Note.foreach = function (repo, notesRef, callback) {
    const wrapperCallback = (blobId, objectId) => {
        // We need to copy the OID since libgit2 types are getting cleaned up
        // incorrectly right now in callbacks

        return callback(blobId.copy(), objectId.copy());
    };

    return asyncForeach(repo, notesRef, wrapperCallback, null);
};

export default Note;
