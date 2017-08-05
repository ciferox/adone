const { std: { path } } = adone;

export default {
    project: {
        name: "$app",
        structure: {
            bin: {
                $before: ({ watch }) => !watch && adone.fs.rm("bin"),
                $from: "src/app.js",
                $to: "bin",
                $transform: (stream) => stream
                    .sourcemapsInit()
                    .transpile({
                        sourceMap: true,
                        plugins: [
                            "transform.ESModules"
                        ]
                    })
                    .sourcemapsWrite(".", {
                        destPath: "bin"
                    }),
                $notify: ({ watch }) => ({
                    onLast: !watch,
                    title: "bin",
                    filter: watch ? (file) => file.extname !== ".map" : null,
                    message: watch ? (file) => path.relative(process.cwd(), file.path) : "Done"
                }),
                $onError: adone.fast.transform.notify.onError({
                    title: "bin",
                    message: (error) => error.message
                })
            }
        }
    }
};
