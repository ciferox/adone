const {
    is
} = adone;

const once = exports.once =
function (value) {
    return function (abort, cb) {
        if (abort) {
            return cb(abort); 
        }
        if (!is.nil(value)) {
            const _value = value; value = null;
            cb(null, _value);
        } else {
            cb(true); 
        }
    };
};

const depthFirst = exports.depthFirst =
function (start, createStream) {
    const reads = []; let ended;

    reads.unshift(once(start));

    return function next(end, cb) {
        if (!reads.length) {
            return cb(true); 
        }
        if (ended) {
            return cb(ended); 
        }

        reads[0](end, (end, data) => {
            if (end) {
                if (end !== true) {
                    ended = end;
                    reads.shift();

                    while (reads.length) {
                        reads.shift()(end, () => {}); 
                    }
          
                    return cb(end);
                }
                //if this stream has ended, go to the next queue
                reads.shift();
                return next(null, cb);
            }
            reads.unshift(createStream(data));
            cb(end, data);
        });
    };
};
//width first is just like depth first,
//but push each new stream onto the end of the queue
const widthFirst = exports.widthFirst = 
function (start, createStream) {
    const reads = [];

    reads.push(once(start));

    return function next(end, cb) {
        if (!reads.length) {
            return cb(true); 
        }
        reads[0](end, (end, data) => {
            if (end) {
                reads.shift();
                return next(null, cb);
            }
            reads.push(createStream(data));
            cb(end, data);
        });
    };
};

//this came out different to the first (strm)
//attempt at leafFirst, but it's still a valid
//topological sort.
const leafFirst = exports.leafFirst = 
function (start, createStream) {
    const reads = [];
    const output = [];
    reads.push(once(start));
  
    return function next(end, cb) {
        reads[0](end, (end, data) => {
            if (end) {
                reads.shift();
                if (!output.length) {
                    return cb(true); 
                }
                return cb(null, output.shift());
            }
            reads.unshift(createStream(data));
            output.unshift(data);
            next(null, cb);
        });
    };
};

