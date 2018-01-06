const {
    crypto: {
        pki: { oids }
    }
} = adone;

export const CN = oids.commonName;
export const commonName = "CN";
export const C = oids.countryName;
export const countryName = "C";
export const L = oids.localityName;
export const localityName = "L";
export const ST = oids.stateOrProvinceName;
export const stateOrProvinceName = "ST";
export const O = oids.organizationName;
export const organizationName = "O";
export const OU = oids.organizationalUnitName;
export const organizationalUnitName = "OU";
export const E = oids.emailAddress;
export const emailAddress = "E";
