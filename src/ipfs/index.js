adone.lazify({
    libp2p: "./libp2p",
    ipld: "./ipld",
    ipns: "./ipns",
    isIPFS: "./is_ipfs",
    httpClient: "./http_client",
    httpResponse: "./http_response",
    Bitswap: "./bitswap",
    Block: "./block",
    BlockService: "./block_service",
    Repo: "./repo",
    IPFS: "./ipfs/core",
    ipfsdCtl: "./ipfsd_ctl",
    mfs: "./mfs",
    multipart: "./multipart",

    UnixFs: "./unixfs",
    unixfsImporter: "./unixfs_importer",
    unixfsExporter: "./unixfs_exporter"
}, adone.asNamespace(exports), require);
