const native = adone.bind("git.node");

const Note = native.Note;

Note.create = adone.promise.promisifyAll(Note.create);
Note.iteratorNew = adone.promise.promisifyAll(Note.iteratorNew);
Note.read = adone.promise.promisifyAll(Note.read);
Note.remove = adone.promise.promisifyAll(Note.remove);

const asyncForeach = adone.promise.promisifyAll(Note.foreach);

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
