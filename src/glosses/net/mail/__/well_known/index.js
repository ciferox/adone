import * as services from "./services";

const { util } = adone;

const normalizeKey = (key) => key.replace(/[^a-zA-Z0-9.\-]/g, "").toLowerCase();

const normalizeService = (service) => {
    const filter = ["domains", "aliases"];
    const response = {};

    Object.keys(service).forEach((key) => {
        if (filter.indexOf(key) < 0) {
            response[key] = service[key];
        }
    });

    return response;
};

const normalized = {};

for (const [key, service] of util.entries(services)) {
    const nkey = normalizeKey(key);
    normalized[nkey] = normalizeService(service);

    if (service.aliases) {
        for (const alias of service.aliases) {
            normalized[normalizeKey(alias)] = normalizeService(service);
        }
    }
    if (service.domains) {
        for (const domain of service.domains) {
            normalized[normalizeKey(domain)] = normalizeService(service);
        }
    }
}

/**
 * Resolves SMTP config for given key. Key can be a name (like 'Gmail'), alias (like 'Google Mail') or
 * an email address (like 'test@googlemail.com').
 *
 * @param {String} key [description]
 * @returns {Object} SMTP config or false if not found
 */
export default function resolve(key) {
    key = normalizeKey(key.split("@").pop());
    return normalized[key] || false;
}
