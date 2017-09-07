import Transform from "./transform";

/**
 * Represents a transform stream that implements synchronous processing
 */
export default class SyncTransform extends Transform {
    _process(value) {
        this._processing = true;
        try {
            this._transform(value);
        } catch (err) {
            this._onError(err);
        }
        this._processing = false;
        this.maybeFlush();
    }
}
