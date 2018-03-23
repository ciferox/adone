const {
    event,
    is
} = adone;

/**
 * @param {!Uint8Array} array1
 * @param {!Uint8Array} array2
 *
 * @return {boolean}
 */
const arrayEquals = function (array1, array2) {
    if (array1 === array2) {
        return true;
    }
    if (array1.length !== array2.length) {
        return false;
    }
    for (let i = 0, length = array1.length; i < length; ++i) {
        if (array1[i] !== array2[i]) {
            return false;
        }
    }
    return true;
};

const createNode = () => {
    return { contacts: [], dontSplit: false, left: null, right: null };
};

/**
 * `options`:
 * `distance`: _Function_
 * `function (firstId, secondId) { return distance }` An optional
 * `distance` function that gets two `id` Uint8Arrays
 * and return distance (as number) between them.
 * `arbiter`: _Function_ _(Default: vectorClock arbiter)_
 * `function (incumbent, candidate) { return contact; }` An optional
 * `arbiter` function that givent two `contact` objects with the same `id`
 * returns the desired object to be used for updating the k-bucket. For
 * more details, see [arbiter function](#arbiter-function).
 * `localNodeId`: _Uint8Array_ An optional Uint8Array representing the local node id.
 * If not provided, a local node id will be created via `randomBytes(20)`.
 * `metadata`: _Object_ _(Default: {})_ Optional satellite data to include
 * with the k-bucket. `metadata` property is guaranteed not be altered by,
 * it is provided as an explicit container for users of k-bucket to store
 * implementation-specific data.
 * `numberOfNodesPerKBucket`: _Integer_ _(Default: 20)_ The number of nodes
 * that a k-bucket can contain before being full or split.
 * `numberOfNodesToPing`: _Integer_ _(Default: 3)_ The number of nodes to
 * ping when a bucket that should not be split becomes full. KBucket will
 * emit a `ping` event that contains `numberOfNodesToPing` nodes that have
 * not been contacted the longest.
 */
export default class KBucket extends event.Emitter {
    constructor(options) {
        super();
        options = options || {};

        this.localNodeId = options.localNodeId || adone.std.crypto.randomBytes(20);
        if (!(this.localNodeId instanceof Uint8Array)) {
            throw new TypeError("localNodeId is not a Uint8Array");
        }
        this.numberOfNodesPerKBucket = options.numberOfNodesPerKBucket || 20;
        this.numberOfNodesToPing = options.numberOfNodesToPing || 3;
        this.distance = options.distance || KBucket.distance;
        // use an arbiter from options or vectorClock arbiter by default
        this.arbiter = options.arbiter || KBucket.arbiter;

        this.root = createNode();

        this.metadata = Object.assign({}, options.metadata);
    }

    static arbiter(incumbent, candidate) {
        return incumbent.vectorClock > candidate.vectorClock ? incumbent : candidate;
    }

    static distance(firstId, secondId) {
        let distance = 0;
        const min = Math.min(firstId.length, secondId.length);
        const max = Math.max(firstId.length, secondId.length);
        let i;
        for (i = 0; i < min; ++i) {
            distance = distance * 256 + (firstId[i] ^ secondId[i]);
        }
        for (; i < max; ++i) {
            distance = distance * 256 + 255;
        }
        return distance;
    }

    // contact: *required* the contact object to add
    add(contact) {
        if (!contact || !(contact.id instanceof Uint8Array)) {
            throw new TypeError("contact.id is not a Uint8Array");
        }
        let bitIndex = 0;

        let node = this.root;
        while (is.null(node.contacts)) {
            // this is not a leaf node but an inner node with 'low' and 'high'
            // branches; we will check the appropriate bit of the identifier and
            // delegate to the appropriate node for further processing
            node = this._determineNode(node, contact.id, bitIndex++);
        }

        // check if the contact already exists
        const index = this._indexOf(node, contact.id);
        if (index >= 0) {
            this._update(node, index, contact);
            return this;
        }

        if (node.contacts.length < this.numberOfNodesPerKBucket) {
            node.contacts.push(contact);
            this.emit("added", contact);
            return this;
        }

        // the bucket is full
        if (node.dontSplit) {
            // we are not allowed to split the bucket
            // we need to ping the first this.numberOfNodesToPing
            // in order to determine if they are alive
            // only if one of the pinged nodes does not respond, can the new contact
            // be added (this prevents DoS flodding with new invalid contacts)
            this.emit("ping", node.contacts.slice(0, this.numberOfNodesToPing), contact);
            return this;
        }

        this._split(node, bitIndex);
        return this.add(contact);
    }

    // id: Uint8Array *required* node id
    // n: Integer (Default: Infinity) maximum number of closest contacts to return
    // Return: Array of maximum of `n` closest contacts to the node id
    closest(id, n) {
        if (!(id instanceof Uint8Array)) {
            throw new TypeError("id is not a Uint8Array");
        }
        if (is.undefined(n)) {
            n = Infinity;
        }
        if (!is.number(n) || isNaN(n) || n <= 0) {
            throw new TypeError("n is not positive number");
        }
        let contacts = [];

        for (let nodes = [this.root], bitIndex = 0; nodes.length > 0 && contacts.length < n;) {
            const node = nodes.pop();
            if (is.null(node.contacts)) {
                const detNode = this._determineNode(node, id, bitIndex++);
                nodes.push(node.left === detNode ? node.right : node.left);
                nodes.push(detNode);
            } else {
                contacts = contacts.concat(node.contacts);
            }
        }

        const self = this;
        const compare = (a, b) => self.distance(a.id, id) - self.distance(b.id, id);

        return contacts.sort(compare).slice(0, n);
    }

    // Counts the number of contacts recursively.
    // If this is a leaf, just return the number of contacts contained. Otherwise,
    // return the length of the high and low branches combined.
    count() {
        // return this.toArray().length
        let count = 0;
        for (let nodes = [this.root]; nodes.length > 0;) {
            const node = nodes.pop();
            if (is.null(node.contacts)) {
                nodes.push(node.right, node.left);
            } else {
                count += node.contacts.length;
            }
        }
        return count;
    }

    // Determines whether the id at the bitIndex is 0 or 1.
    // Return left leaf if `id` at `bitIndex` is 0, right leaf otherwise
    // node: internal object that has 2 leafs: left and right
    // id: a Uint8Array to compare localNodeId with
    // bitIndex: the bitIndex to which bit to check in the id Uint8Array
    _determineNode(node, id, bitIndex) {
        // **NOTE** remember that id is a Uint8Array and has granularity of
        // bytes (8 bits), whereas the bitIndex is the _bit_ index (not byte)

        // id's that are too short are put in low bucket (1 byte = 8 bits)
        // parseInt(bitIndex / 8) finds how many bytes the bitIndex describes
        // bitIndex % 8 checks if we have extra bits beyond byte multiples
        // if number of bytes is <= no. of bytes described by bitIndex and there
        // are extra bits to consider, this means id has less bits than what
        // bitIndex describes, id therefore is too short, and will be put in low
        // bucket
        const bytesDescribedByBitIndex = ~~(bitIndex / 8);
        const bitIndexWithinByte = bitIndex % 8;
        if ((id.length <= bytesDescribedByBitIndex) && (bitIndexWithinByte !== 0)) {
            return node.left;
        }

        const byteUnderConsideration = id[bytesDescribedByBitIndex];

        // byteUnderConsideration is an integer from 0 to 255 represented by 8 bits
        // where 255 is 11111111 and 0 is 00000000
        // in order to find out whether the bit at bitIndexWithinByte is set
        // we construct Math.pow(2, (7 - bitIndexWithinByte)) which will consist
        // of all bits being 0, with only one bit set to 1
        // for example, if bitIndexWithinByte is 3, we will construct 00010000 by
        // Math.pow(2, (7 - 3)) -> Math.pow(2, 4) -> 16
        if (byteUnderConsideration & Math.pow(2, (7 - bitIndexWithinByte))) {
            return node.right;
        }

        return node.left;
    }

    // Get a contact by its exact ID.
    // If this is a leaf, loop through the bucket contents and return the correct
    // contact if we have it or null if not. If this is an inner node, determine
    // which branch of the tree to traverse and repeat.
    // id: Uint8Array *required* The ID of the contact to fetch.
    get(id) {
        if (!(id instanceof Uint8Array)) {
            throw new TypeError("id is not a Uint8Array");
        }
        let bitIndex = 0;

        let node = this.root;
        while (is.null(node.contacts)) {
            node = this._determineNode(node, id, bitIndex++);
        }

        const index = this._indexOf(node, id); // index of uses contact id for matching
        return index >= 0 ? node.contacts[index] : null;
    }

    // node: internal object that has 2 leafs: left and right
    // id: Uint8Array Contact node id.
    // Returns the index of the contact with the given id if it exists
    _indexOf(node, id) {
        for (let i = 0; i < node.contacts.length; ++i) {
            if (arrayEquals(node.contacts[i].id, id)) {
                return i;
            }
        }

        return -1;
    }

    // id: Uint8Array *required* The ID of the contact to remove.
    remove(id) {
        if (!(id instanceof Uint8Array)) {
            throw new TypeError("id is not a Uint8Array");
        }
        let bitIndex = 0;

        let node = this.root;
        while (is.null(node.contacts)) {
            node = this._determineNode(node, id, bitIndex++);
        }

        const index = this._indexOf(node, id);
        if (index >= 0) {
            const contact = node.contacts.splice(index, 1)[0];
            this.emit("removed", contact);
        }

        return this;
    }

    // Splits the node, redistributes contacts to the new nodes, and marks the
    // node that was split as an inner node of the binary tree of nodes by
    // setting this.root.contacts = null
    // node: *required* node for splitting
    // bitIndex: *required* the bitIndex to which byte to check in the Uint8Array
    //          for navigating the binary tree
    _split(node, bitIndex) {
        node.left = createNode();
        node.right = createNode();

        // redistribute existing contacts amongst the two newly created nodes
        for (let i = 0; i < node.contacts.length; ++i) {
            const contact = node.contacts[i];
            this._determineNode(node, contact.id, bitIndex).contacts.push(contact);
        }
        node.contacts = null; // mark as inner tree node

        // don't split the "far away" node
        // we check where the local node would end up and mark the other one as
        // "dontSplit" (i.e. "far away")
        const detNode = this._determineNode(node, this.localNodeId, bitIndex);
        const otherNode = node.left === detNode ? node.right : node.left;
        otherNode.dontSplit = true;
    }

    // Returns all the contacts contained in the tree as an array.
    // If this is a leaf, return a copy of the bucket. `slice` is used so that we
    // don't accidentally leak an internal reference out that might be accidentally
    // misused. If this is not a leaf, return the union of the low and high
    // branches (themselves also as arrays).
    toArray() {
        let result = [];
        for (let nodes = [this.root]; nodes.length > 0;) {
            const node = nodes.pop();
            if (is.null(node.contacts)) {
                nodes.push(node.right, node.left);
            } else {
                result = result.concat(node.contacts);
            }
        }
        return result;
    }

    // Updates the contact selected by the arbiter.
    // If the selection is our old contact and the candidate is some new contact
    // then the new contact is abandoned (not added).
    // If the selection is our old contact and the candidate is our old contact
    // then we are refreshing the contact and it is marked as most recently
    // contacted (by being moved to the right/end of the bucket array).
    // If the selection is our new contact, the old contact is removed and the new
    // contact is marked as most recently contacted.
    // node: internal object that has 2 leafs: left and right
    // contact: *required* the contact to update
    // index: *required* the index in the bucket where contact exists
    //        (index has already been computed in a previous calculation)
    _update(node, index, contact) {
        // sanity check
        if (!arrayEquals(node.contacts[index].id, contact.id)) {
            throw new Error("wrong index for _update");
        }

        const incumbent = node.contacts[index];
        const selection = this.arbiter(incumbent, contact);
        // if the selection is our old contact and the candidate is some new
        // contact, then there is nothing to do
        if (selection === incumbent && incumbent !== contact) {
            return;
        }

        node.contacts.splice(index, 1); // remove old contact
        node.contacts.push(selection); // add more recent contact version
        this.emit("updated", incumbent, selection);
    }
}
