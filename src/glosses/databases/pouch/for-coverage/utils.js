//
// PouchDB.utils is basically a throwback to the pre-Browserify days,
// when this was the easiest way to access global utilities from anywhere
// in the project. For code cleanliness, we're trying to remove this file,
// but for practical reasons (legacy code, test code, etc.) this is still here.
//

import {
    parseUri,
    uuid,
    rev,
    clone,
    parseDdocFunctionName,
    normalizeDdocFunctionName,
    once,
    upsert,
    toPromise,
    defaultBackOff
} from '../utils';

import {
    merge,
    winningRev
} from '../merge';

import {
    atob,
    btoa,
    binaryStringToBlobOrBuffer,
    blob
} from '../binary-utils';

import {
    uniq,
    sequentialize,
    fin,
    callbackify,
    promisedCallback
} from '../mapreduce-utils';


import {
    createError,
    generateErrorFromResponse
} from '../errors';

import generateReplicationId from '../generate-replication-id';
import checkpointer from '../checkpointer';

export default {
    blob: blob,
    parseUri: parseUri,
    uuid: uuid,
    rev: rev,
    atob: atob,
    btoa: btoa,
    binaryStringToBlobOrBuffer: binaryStringToBlobOrBuffer,
    clone: clone,
    createError: createError,
    generateErrorFromResponse: generateErrorFromResponse,
    generateReplicationId: generateReplicationId,
    parseDdocFunctionName: parseDdocFunctionName,
    normalizeDdocFunctionName: normalizeDdocFunctionName,
    once: once,
    merge: merge,
    winningRev: winningRev,
    upsert: upsert,
    toPromise: toPromise,
    checkpointer: checkpointer,
    defaultBackOff: defaultBackOff,
    assign: Object.assign,
    mapReduceUtils: {
        uniq: uniq,
        sequentialize: sequentialize,
        fin: fin,
        callbackify: callbackify,
        promisedCallback: promisedCallback
    }
};
