
function rev() {
    return adone.util.uuid.v4().replace(/-/g, "").toLowerCase();
}

export default rev;
