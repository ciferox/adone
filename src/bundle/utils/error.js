export default function error(props) {
    if (props instanceof Error)
        throw props;
    const err = new Error(props.message);
    Object.keys(props).forEach(key => {
        err[key] = props[key];
    });
    throw err;
}
