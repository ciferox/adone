const {
    cli,
    is,
    app: {
        Subsystem,
        command
    },
    github
} = adone;

const commonOptions = [
    {
        name: "--owner",
        type: String,
        required: true,
        description: "GitHub repository owner"
    },
    {
        name: "--repo",
        type: String,
        required: true,
        description: "GitHub repository name"
    },
    {
        name: "--auth",
        type: String,
        description: "Auth value `username:password` or `token`"
    },
    {
        name: "--api-base",
        type: String,
        default: "https://api.github.com",
        description: "The base GitHub API url"
    },
    {
        name: "--raw",
        description: "Show raw result"
    }
];

export default class extends Subsystem {
    onConfigure() {
        this.log = this.root.log;
    }

    @command({
        name: "createRelease",
        description: "Create a new release",
        options: [
            ...commonOptions,
            {
                name: "--name",
                type: String,
                description: "The name of the release"
            },
            {
                name: ["--tag", "-T"],
                type: String,
                required: true,
                description: "The name of the tag"
            },
            {
                name: "--target-commitish",
                type: String,
                default: "master",
                description: "Commitish value that determines where the Git tag is created from"
            },
            {
                name: "--body",
                type: String,
                default: "",
                description: "Text describing the contents of the tag"
            },
            {
                name: "--draft",
                description: "Unpublished/draft release"
            },
            {
                name: "--prerelease",
                description: "Prerelease release"
            }
        ]
    })
    async createRelease(args, opts) {
        try {
            const { owner, repo, auth, apiBase, raw, ...options } = opts.getAll();

            this.log({
                message: "processing"
            });

            const relManager = new github.GitHubReleaseManager({ owner, repo, auth, apiBase });
            const relInfo = await relManager.createRelease(options);

            this.log({
                inspect: {
                    value: relInfo,
                    onlyProps: raw ? undefined : ["id", "tag_name", "name", "url", "assets_url", "html_url", "upload_url", "draft", "prerelease"]
                },
                status: true,
                clean: true
            });

            return 0;
        } catch (err) {
            this.log({
                message: err.message,
                status: false
                // clean: true
            });
            // console.log(adone.pretty.error(err));
            return 1;
        }
    }

    @command({
        name: "updateRelease",
        description: "Edit a release",
        options: [
            ...commonOptions,
            {
                name: "--id",
                type: String,
                description: "Release id to be updated"
            },
            {
                name: "--name",
                type: String,
                description: "The name of the release"
            },
            {
                name: ["--tag", "-T"],
                type: String,
                description: "The name of the tag"
            },
            {
                name: "--target-commitish",
                type: String,
                description: "Commitish value that determines where the Git tag is created from"
            },
            {
                name: "--body",
                type: String,
                description: "Text describing the contents of the tag"
            },
            {
                name: "--draft",
                description: "Unpublished/draft release"
            },
            {
                name: "--prerelease",
                description: "Prerelease release"
            }
        ]
    })
    async updateRelease(args, opts) {
        try {
            const options = opts.getAll();
            let { id } = options;
            const { owner, repo, auth, apiBase, raw } = options;

            if (!id && !options.tag) {
                throw new adone.error.NotValidException("please specify release id or tag name");
            }

            this.log({
                message: "processing"
            });

            const relManager = new github.GitHubReleaseManager({ owner, repo, auth, apiBase });

            if (options.tag && !id) {
                const targetRel = await relManager.getReleaseByTag(options.tag);
                id = targetRel.id;
            }

            const props = {};
            if (opts.has("name")) {
                props.name = options.name;
            }
            if (opts.has("tag")) {
                props.tag = options.tag;
            }
            if (opts.has("targetCommitish")) {
                props.targetCommitish = options.targetCommitish;
            }
            if (opts.has("body")) {
                props.body = options.body;
            }
            props.draft = options.draft;
            props.prerelease = options.prerelease;

            const relInfo = await relManager.updateRelease(id, props);

            this.log({
                inspect: {
                    value: relInfo,
                    onlyProps: raw ? undefined : ["id", "tag_name", "name", "url", "assets_url", "html_url", "upload_url", "draft", "prerelease"]
                },
                status: true,
                clean: true
            });

            return 0;
        } catch (err) {
            this.log({
                message: err.message,
                status: false
                // clean: true
            });
            // console.log(adone.pretty.error(err));
            return 1;
        }
    }

    @command({
        name: "deleteRelease",
        description: "Delete a release",
        options: [
            ...commonOptions,
            {
                name: "--id",
                type: String,
                description: "Release id to be deleted"
            },
            {
                name: "--tag",
                type: String,
                description: "Tag associated with release"
            }
        ]
    })
    async deleteRelease(args, opts) {
        try {
            const options = opts.getAll();
            let { id } = options;
            const { owner, repo, auth, apiBase, tag } = options;

            if (!id && !tag) {
                throw new adone.error.NotValidException("please specify release id or tag name");
            }

            this.log({
                message: "processing"
            });

            const relManager = new github.GitHubReleaseManager({ owner, repo, auth, apiBase });

            if (options.tag && !id) {
                const targetRel = await relManager.getReleaseByTag(options.tag);
                id = targetRel.id;
            }

            await relManager.deleteRelease(id);

            this.log({
                message: `release ${cli.style.primary(id)} successfully deleted`,
                status: true
            });

            return 0;
        } catch (err) {
            this.log({
                message: err.message,
                status: false
                // clean: true
            });
            // console.log(adone.pretty.error(err));
            return 1;
        }
    }

    @command({
        name: "listReleases",
        description: "Get information about all releases",
        options: [
            ...commonOptions
        ]
    })
    async listReleases(args, opts) {
        try {
            const { owner, repo, auth, apiBase, raw } = opts.getAll();

            this.log({
                message: "processing"
            });

            const relManager = new github.GitHubReleaseManager({ owner, repo, auth, apiBase });
            const releases = await relManager.listReleases();

            this.log({
                inspect: {
                    value: releases,
                    onlyProps: raw ?
                        undefined :
                        ["id", "url", "assets_url", "html_url", "upload_url", "tag_name", "name", "draft", "prerelease", "created_at", "target_commitish"]
                },
                status: true,
                clean: true
            });

            return 0;
        } catch (err) {
            this.log({
                message: err.message,
                status: false
                // clean: true
            });
            // console.log(adone.pretty.error(err));
            return 1;
        }
    }

    @command({
        name: "listAssets",
        description: "List assets for a release by id or tag",
        options: [
            ...commonOptions,
            {
                name: "--id",
                type: String,
                description: "Release id"
            },
            {
                name: "--tag",
                type: String,
                description: "Tag associated with release"
            }
        ]
    })
    async listAssets(args, opts) {
        try {
            const options = opts.getAll();
            const { id, owner, repo, auth, apiBase, tag, raw } = options;

            if (!id && !tag) {
                throw new adone.error.NotValidException("please specify release id or tag name");
            }

            this.log({
                message: "processing"
            });

            const relManager = new github.GitHubReleaseManager({ owner, repo, auth, apiBase });
            const result = await ((tag && !id)
                ? relManager.listAssetsByTag(tag)
                : relManager.listAssets(id));

            this.log({
                inspect: {
                    value: result,
                    onlyProps: raw ?
                        undefined :
                        ["id", "url", "browser_download_url", "name", "size", "download_count", "created_at", "updated_at"]
                },
                status: true,
                clean: true
            });

            return 0;
        } catch (err) {
            this.log({
                message: err.message,
                status: false
                // clean: true
            });
            // console.log(adone.pretty.error(err));
            return 1;
        }
    }

    @command({
        name: "uploadAsset",
        description: "Upload a release asset",
        options: [
            ...commonOptions,
            {
                name: ["--tag", "-T"],
                type: String,
                required: true,
                description: "The name of the release tag"
            },
            {
                name: ["--name", "-N"],
                type: String,
                description: "The file name of the asset"
            },
            {
                name: ["--path", "-P"],
                type: String,
                required: true,
                description: "Path to file for upload"
            }
        ]
    })
    async uploadAsset(args, opts) {
        let bar;
        try {
            const { owner, repo, auth, apiBase, raw, tag, name, path } = opts.getAll();

            this.log({
                message: "uploading"
            });

            const relManager = new github.GitHubReleaseManager({ owner, repo, auth, apiBase });
            const result = await relManager.uploadAsset({
                tag,
                name,
                path
            });

            this.log({
                inspect: {
                    value: result,
                    onlyProps: raw ?
                        undefined :
                        ["id", "url", "browser_download_url", "name"]
                },
                status: true,
                clean: true
            });

            return 0;
        } catch (err) {
            if (bar) {
                bar.destroy();
            }
            this.log({
                message: err.message,
                status: false,
                // clean: true
            });
            // console.log(adone.pretty.error(err));
            return 1;
        }
    }

    @command({
        name: "deleteAsset",
        description: "Delete a release asset",
        options: [
            ...commonOptions,
            {
                name: "--id",
                type: String,
                required: true,
                description: "Asset id"
            }
        ]
    })
    async deleteAsset(args, opts) {
        try {
            const options = opts.getAll();
            const { owner, repo, auth, apiBase, id } = options;

            this.log({
                message: "processing"
            });

            const relManager = new github.GitHubReleaseManager({ owner, repo, auth, apiBase });
            await relManager.deleteAsset(id);

            this.log({
                message: `asset ${cli.style.primary(id)} successfully deleted`,
                status: true
            });

            return 0;
        } catch (err) {
            this.log({
                message: err.message,
                status: false
                // clean: true
            });
            // console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
