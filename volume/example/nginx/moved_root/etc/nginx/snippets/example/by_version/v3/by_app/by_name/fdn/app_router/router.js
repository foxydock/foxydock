const mergedUpstreamMap = {};
Object.assign(
  mergedUpstreamMap,
  fdn_app_upstream_map,
  inject_fdn_app_upstream_map
);

const mergedNamespaceMap = {}
Object.keys(namespace_map).forEach((key) => {
  const item = namespace_map[key];
  mergedNamespaceMap[key] = {
    blackListMode: item.blackListMode,
    appList: Array.from(item.appList),
  };
});

Object.keys(inject_namespace_map).forEach((key) => {
  const item = inject_namespace_map[key];
  mergedNamespaceMap[key] = {
    blackListMode: item.blackListMode,
    appList: Array.from(item.appList),
  };
});

const server404 = "http://unix:/var/run/nginx/fdn_app_server_404.sock";

function buildFdnAppRouteUpstream(r) {
  const fdnAppName = r.variables.fdn_app_name;
  const fdnAppNamespace = r.variables.fdn_app_namespace;

  // APP 都不存在，何谈命名空间？直接返回 404
  if (!mergedUpstreamMap.hasOwnProperty(fdnAppName)) {
    return server404;
  }

  // 如果命名空间没映射，默认绕过。因为大多数用户不想配置也不需要复杂的命名空间。
  if (fdnAppNamespace !== void 0) {
    if (!mergedNamespaceMap.hasOwnProperty(fdnAppNamespace)) {
      return server404;
    }

    const namespaceConfig = mergedNamespaceMap[fdnAppNamespace];
    const ban = namespaceConfig.blackListMode
      ? namespaceConfig.appList.includes(fdnAppName)
      : !namespaceConfig.appList.includes(fdnAppName);
    if (ban) {
      return server404;
    }
  }

  const fdnAppConfig = mergedUpstreamMap[fdnAppName];
  // console.error(`buildFdnAppRouteUpstream route config: >>>${JSON.stringify(fdnAppConfig)}<<<`, )
  // console.error(`buildFdnAppRouteUpstream fdnAppName: >>>${fdnAppName}<<<`, )
  if (fdnAppConfig.notCommon) {
    return `http://unix:/var/run/nginx/fdn_app_server_${fdnAppName}.sock`;
  }

  return "http://unix:/var/run/nginx/fdn_app_server_common.sock";
}

function buildFdnAppUpstream(r) {
  const fdnAppName = r.variables.fdn_app_name;
  const fdnAppNamespace = r.variables.fdn_app_namespace;

  // APP 不存在
  if (!mergedUpstreamMap.hasOwnProperty(fdnAppName)) {
    return "";
  }

  const fdnAppConfig = mergedUpstreamMap[fdnAppName];
  if (fdnAppConfig === void 0) {
    return "";
  }
  
  // 如果命名空间没映射，默认绕过。因为大多数用户不想配置也不需要复杂的命名空间。
  if (fdnAppNamespace !== void 0) {
    if (!mergedNamespaceMap.hasOwnProperty(fdnAppNamespace)) {
      return "";
    }

    const namespaceConfig = mergedNamespaceMap[fdnAppNamespace];
    const ban = namespaceConfig.blackListMode
      ? namespaceConfig.appList.includes(fdnAppName)
      : !namespaceConfig.appList.includes(fdnAppName);
    if (ban) {
      return "";
    }
  }

  const upstreamConfig = fdnAppConfig.upstream;

  let appSchema = "http";
  if (upstreamConfig.schema && upstreamConfig.schema.tls) {
    appSchema = "https";
  }

  const appUri =
    fdnAppConfig.rawRequestUri ?? false ? r.variables.request_uri : "";
  let result = "";
  if (upstreamConfig.socket === "ip") {
    result = `${appSchema}://${upstreamConfig.host}:${upstreamConfig.port}${appUri}`;
  } else if (upstreamConfig.socket === "uds") {
    result = `${appSchema}://unix:${upstreamConfig.path}${appUri}`;
  }

  // console.error('buildFdnAppUpstream result:', result)
  return result;
}

export default {
  buildFdnAppRouteUpstream,
  buildFdnAppUpstream,
};
