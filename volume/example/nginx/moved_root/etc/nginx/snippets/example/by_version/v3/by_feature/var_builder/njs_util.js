function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default { deepCopy };
