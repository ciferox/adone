/**
 * Returns a set/get style internal storage bucket.
 *
 * @return {object} the API to set and retrieve data
 */
class MiniStore {
    constructor(){
        this.bucket = {};
    }

    /**
     * Sets a property on the store, with the given value.
     *
     * @param    {string} property    an identifier for the data
     * @param    {*}            value         the value of the data being stored
     * @return {function} the set function itself to allow chaining
     */
    set(property, value) {
        this.bucket[property] = value;
        return this.set.bind(this);
    }

    /**
     * Returns the store item asked for, otherwise all of the items.
     *
     * @param    {string|undefined} property    the property being requested
     * @return {*} the store item that was matched
     */
    get(property) {
        if (!property) {
            return this.bucket;
        }

        return this.bucket[property];
    }
}

export default MiniStore;
