export function bindNew(obj, ...names) {
    const result = {};
    for (const name of names)
        result[name] = (obj[name] || (() => 0)).bind(obj);
    return result;
}
export function bind(obj, ...names) {
    for (const name of names)
        obj[name] = obj[name].bind(obj);
    return obj;
}
