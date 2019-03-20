const {
    stream: { pull }
} = adone;
const { asyncMap, collect, pushable, pair: pullPair, batch } = pull;

module.exports = function (reduce, options) {
    const pair = pullPair()
    const source = pair.source
    const result = pushable()

    pull(
        source,
        batch(Infinity),
        asyncMap(reduce),
        collect((err, roots) => {
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
    )

    return {
        sink: pair.sink,
        source: result
    }
}
