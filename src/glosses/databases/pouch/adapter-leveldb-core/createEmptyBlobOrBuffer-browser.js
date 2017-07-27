import { blob as createBlob } from '../binary-utils';

function createEmptyBlobOrBuffer(type) {
    return createBlob([''], { type: type });
}

export default createEmptyBlobOrBuffer;