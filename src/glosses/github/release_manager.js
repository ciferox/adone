const {
    github
} = adone;

const DEFAULT_API_BASE = "https://api.github.com";

/**
 * Manages github repository releases.
 */
export default class GitHubReleaseManager {
    constructor({ owner, repo, auth: githubAuth = "", apiBase = DEFAULT_API_BASE } = {}) {
        let auth = (process.env.GITHUB_AUTH || githubAuth).trim();
        if (auth) {
            if (auth.includes(":")) {
                const parts = auth.split(":");
                auth = {
                    username: parts[0],
                    password: parts[1]
                };
            } else {
                auth = {
                    token: auth
                };
            }
        }

        const fullname = `${owner}/${repo}`;
        this.apiBase = apiBase;
        this.repo = new github.Repository(fullname, auth, apiBase);
        this.auth = auth;
    }

    /**
     * Creates new release
     */
    async createRelease(options = {}) {
        return (await this.repo.createRelease({
            tag_name: options.tag,
            name: options.name,
            body: options.body,
            target_commitish: options.targetCommitish,
            draft: options.draft,
            prerelease: options.prerelease
        })).data;
    }

    async updateRelease(id, options) {
        return (await this.repo.updateRelease(id, {
            tag_name: options.tag,
            name: options.name,
            body: options.body,
            target_commitish: options.targetCommitish,
            draft: options.draft,
            prerelease: options.prerelease
        })).data;
    }

    async deleteRelease(id) {
        return (await this.repo.deleteRelease(id)).data;
    }

    async listReleases() {
        return (await this.repo.listReleases()).data;
    }

    async getRelease(id) {
        return (await this.repo.getRelease(id)).data;
    }

    async getReleaseByTag(tag) {
        try {
            return (await this.repo.getReleaseByTag(tag)).data;
        } catch (err) {
            if (err.response.status === 404) {
                throw new adone.error.NotFoundException(`release with tag '${tag}' not found`);
            }
            throw err;
        }
    }

    async listAssets(id) {
        return (await this.repo.listAssets(id)).data;
    }

    async listAssetsByTag(tag) {
        const relInfo = await this.getReleaseByTag(tag);
        return (await this.repo.listAssets(relInfo.id)).data;
    }

    async uploadAsset({ tag, name, path } = {}) {
        if (!this.auth.token) {
            throw new adone.error.NotValidException("Invalid auth token");
        }

        const filePath = adone.path.resolve(path);
        const stats = await adone.fs.stat(filePath);

        if (!name) {
            name = adone.path.basename(filePath);
        }

        const releaseInfo = await this.getReleaseByTag(tag);
        const uploadUrl = `${releaseInfo.upload_url.replace(/({.+})$/, "")}?name=${name}`;

        return (await adone.http.client.request.post(uploadUrl, adone.fs.createReadStream(filePath), {
            maxContentLength: stats.size,
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": stats.size,
                Authorization: `token ${this.auth.token}`
            },
            rejectUnauthorized: false
        })).data;
    }

    async updateAsset({ id, name, path } = {}) {
        
    }

    async deleteAsset(assetId) {
        return (await this.repo.deleteAsset(assetId)).data;
    }
}
