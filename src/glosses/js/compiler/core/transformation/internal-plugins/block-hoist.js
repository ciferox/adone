// @flow


const {
    js: { compiler: { transformation: { Plugin } } },
    vendor: { lodash: { sortBy } },
    is
} = adone;

export default new Plugin({
    name: "internal.blockHoist",

    visitor: {
        Block: {
            exit({ node }) {
                let hasChange = false;
                for (let i = 0; i < node.body.length; i++) {
                    const bodyNode = node.body[i];
                    if (bodyNode && is.exist(bodyNode._blockHoist)) {
                        hasChange = true;
                        break;
                    }
                }
                if (!hasChange) {
                    return;
                }

                node.body = sortBy(node.body, (bodyNode) => {
                    let priority = bodyNode && bodyNode._blockHoist;
                    if (is.nil(priority)) {
                        priority = 1;
                    }
                    if (priority === true) {
                        priority = 2;
                    }

                    // Higher priorities should move toward the top.
                    return -1 * priority;
                });
            }
        }
    }
});
