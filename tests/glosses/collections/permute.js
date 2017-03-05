
module.exports = permute;
function permute(values) {
    if (values.length === 0)
        return [];
    if (values.length === 1)
        return [values];
    const permutations = [];
    for (let index = 0; index < values.length; index++) {
        const tail = values.slice();
        const head = tail.splice(index, 1);
        permute(tail).forEach(function (permutation) {
            permutations.push(head.concat(permutation));
        });
    }
    return permutations;
}

