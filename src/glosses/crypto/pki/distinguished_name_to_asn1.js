const __ = adone.private(adone.crypto.pki);

/**
 * Converts a DistinguishedName (subject or issuer) to an ASN.1 object.
 *
 * @param dn the DistinguishedName.
 *
 * @return the asn1 representation of a DistinguishedName.
 */
export default function distinguishedNameToAsn1(dn) {
    return __.dnToAsn1(dn);
}
