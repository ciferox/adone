import { typedBuffer } from '../binary-utils';

function createEmptyBlobOrBuffer(type) {
    return typedBuffer('', 'binary', type);
}

export default createEmptyBlobOrBuffer;