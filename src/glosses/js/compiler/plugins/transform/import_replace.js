// @flow



export default function () {
    const { path } = adone.std;
    return {
        visitor: {
            ImportDeclaration(p, state) {
                if (p.node.source.value.startsWith(state.opts.old)) {
                    const relative = path.relative(state.opts.old, p.node.source.value);
                    p.node.source.value = `./${path.relative(path.dirname(state.file.opts.filename), path.resolve(state.opts.new, relative))}`;
                }
            }
        }
    };
}
