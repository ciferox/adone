const { std: { fs } } = adone;

adone.run({
    main() {
        const screen = new adone.cui.Screen();

        //create layout and widgets
        const grid = new adone.cui.GridLayout({ rows: 1, cols: 2, screen });

        const tree = grid.set(0, 0, 1, 1, adone.cui.widget.Tree,
            {
                style: { text: "red" },
                template: { lines: true },
                label: "Filesystem Tree"
            });

        const table = grid.set(0, 1, 1, 1, adone.cui.widget.ExTable,
            {
                keys: true,
                fg: "green",
                label: "Informations",
                columnWidth: [24, 10, 10]
            });

        //file explorer
        const explorer = {
            name: "/",
            extended: true,
            // Custom function used to recursively determine the node path
            getPath(self) {
                // If we don't have any parent, we are at tree root, so return the base case
                if (!self.parent) {
                    return "";
                }
                // Get the parent node path and add this node name
                return `${self.parent.getPath(self.parent)}/${self.name}`;
            },
            // Child generation function
            children(self) {
                let result = {};
                const selfPath = self.getPath(self);
                try {
                    // List files in this directory
                    const children = fs.readdirSync(`${selfPath}/`);

                    // childrenContent is a property filled with self.children() result
                    // on tree generation (tree.setData() call)
                    if (!self.childrenContent) {
                        for (let child in children) {
                            child = children[child];
                            const completePath = `${selfPath}/${child}`;
                            if (fs.lstatSync(completePath).isDirectory()) {
                                // If it's a directory we generate the child with the children generation function
                                result[child] = { name: child, getPath: self.getPath, extended: false, children: self.children };
                            } else {
                                // Otherwise children is not set (you can also set it to "{}" or "null" if you want)
                                result[child] = { name: child, getPath: self.getPath, extended: false };
                            }
                        }
                    } else {
                        result = self.childrenContent;
                    }
                } catch (e) { }
                return result;
            }
        };

        //set tree
        tree.setData(explorer);

        // Handling select event. Every custom property that was added to node is 
        // available like the "node.getPath" defined above
        tree.on("select", (node) => {
            let path = node.getPath(node);
            let data = [];

            // The filesystem root return an empty string as a base case
            if (path === "") {
                path = "/";
            }

            // Add data to right array
            data.push([path]);
            data.push([""]);
            try {
                // Add results
                data = data.concat(JSON.stringify(fs.lstatSync(path), null, 2).split("\n").map((e) => {
                    return [e];
                }));
                table.setData({ headers: ["Info"], data });
            } catch (e) {
                table.setData({ headers: ["Info"], data: [[e.toString()]] });
            }

            screen.render();
        });

        //set default table
        table.setData({ headers: ["Info"], data: [[]] });

        screen.key(["escape", "q", "C-c"], (ch, key) => {
            return process.exit(0);
        });

        screen.key(["tab"], (ch, key) => {
            if (screen.focused === tree.rows) {
                table.focus();
            } else {
                tree.focus();
            }
        });

        tree.focus();
        screen.render();
    }
});
