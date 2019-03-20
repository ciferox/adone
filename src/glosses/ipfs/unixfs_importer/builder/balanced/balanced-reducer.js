const {
    stream: { pull }
} = adone;
const { asyncMap, collect, values, pushable, pair: pullPair, batch } = pull;

module.exports = function balancedReduceToRoot(reduce, options) {
    const pair = pullPair()
    const source = pair.source

    const result = pushable()

    reduceToParents(source, (err, roots) => {
        if (err) {
            result.end(err)
            return // early
        }
        if (roots.length === 1) {
            result.push(roots[0])
            result.end()
        } else if (roots.length > 1) {
            result.end(new Error('expected a maximum of 1 roots and got ' + roots.length))
        } else {
            result.end()
        }
    })

    function reduceToParents(_chunks, callback) {
        let chunks = _chunks
        if (Array.isArray(chunks)) {
            chunks = values(chunks)
        }

        pull(
            chunks,
            batch(options.maxChildrenPerNode),
            asyncMap(reduce),
            collect(reduced)
        )

        function reduced(err, roots) {
            if (err) {
                callback(err)
            } else if (roots.length > 1) {
                reduceToParents(roots, callback)
            } else {
                callback(null, roots)
            }
        }
    }

    return {
        sink: pair.sink,
        source: result
    }
}
