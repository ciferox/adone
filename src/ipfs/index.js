export const version = "0.35.0";

adone.lazify({
    ipld: "./ipld",
    ipns: "./ipns",
    isIPFS: "./is_ipfs",
    httpClient: "./http_client",
    httpResponse: "./http_response",
    Bitswap: "./bitswap",
    Block: "./block",
    BlockService: "./block_service",
    Repo: "./repo",
    IPFS: "./main/core",
    ipfsdCtl: "./ipfsd_ctl",
    mfs: "./mfs",
    multipart: "./multipart",

    UnixFs: "./unixfs",
    unixfsImporter: "./unixfs_importer",
    unixfsExporter: "./unixfs_exporter",

    go: "./go_ipfs"
}, adone.asNamespace(exports), require);
