const mergedUpstreamMap = JSON.parse(JSON.stringify(fdn_app_upstream_map));
Object.keys(inject_fdn_app_upstream_map).forEach((key) => {
  const item = JSON.parse(JSON.stringify(inject_fdn_app_upstream_map[key]));
  if (mergedUpstreamMap.hasOwnProperty(key)) {
    Object.assign(mergedUpstreamMap[key], item);
  } else {
    mergedUpstreamMap[key] = item;
  }
});

const mergedNamespaceMap = JSON.parse(JSON.stringify(namespace_map));
Object.keys(inject_namespace_map).forEach((key) => {
  const item = inject_namespace_map[key];
  mergedNamespaceMap[key] = {
    blackListMode: item.blackListMode,
    appList: Array.from(item.appList),
  };
});

const server404 = "http://unix:/var/run/nginx/fdn_app_server_404.sock";
import inject_main from "snippets/config/by_version/v3/by_app/by_name/fdn/app_ingress/inject_main.js";

function getNamespaceConfig(fdnAppNamespace) {
  let namespaceConfig = void 0;
  if (fdnAppNamespace !== void 0 && mergedNamespaceMap.hasOwnProperty(fdnAppNamespace)) {
    namespaceConfig = mergedNamespaceMap[fdnAppNamespace];
  }

  return namespaceConfig;
}

function banByNamespace(fdnAppName, namespaceConfig) {
    return namespaceConfig.blackListMode
      ? namespaceConfig.appList.includes(fdnAppName)
      : !namespaceConfig.appList.includes(fdnAppName);
}

function getUpstreamMapByNamespaceConfig(namespaceConfig) {
  let profile = 'default';
  if (namespaceConfig && namespaceConfig.hasOwnProperty('profile')) {
    profile = namespaceConfig.profile;
  }

  return mergedUpstreamMap.hasOwnProperty(profile) ? mergedUpstreamMap[profile] : {};
}

function buildFdnAppRouteUpstream(r) {
  const fdnAppName = r.variables.fdn_app_name;
  const fdnAppNamespace = r.variables.fdn_app_namespace;

  // 如果命名空间没映射，默认绕过。因为大多数用户不想配置也不需要复杂的命名空间。
  let namespaceConfig = void 0;
  if (fdnAppNamespace !== void 0) {
    let namespaceConfig = getNamespaceConfig(fdnAppNamespace);
    if (!namespaceConfig) {
      return server404;
    }

    if (banByNamespace(fdnAppName, namespaceConfig)) {
      return server404;
    }
  }

  const upstreamMap = getUpstreamMapByNamespaceConfig(namespaceConfig);
  // APP 不存在
  if (!upstreamMap.hasOwnProperty(fdnAppName)) {
    return server404;
  }

  const fdnAppConfig = upstreamMap[fdnAppName];
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
  
  let namespaceConfig = void 0;
  if (fdnAppNamespace !== void 0) {
    let namespaceConfig = getNamespaceConfig(fdnAppNamespace);
    if (!namespaceConfig) {
      return "";
    }

    if (banByNamespace(fdnAppName, namespaceConfig)) {
      return "";
    }
  }

  const upstreamMap = getUpstreamMapByNamespaceConfig(namespaceConfig);
  // APP 不存在
  if (!upstreamMap.hasOwnProperty(fdnAppName)) {
    return "";
  }

  const fdnAppConfig = upstreamMap[fdnAppName];
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


/**
 * @param r NGINX HTTP请求上下文
 * @param currentHttpHeaderKey 当前正在处理的 HTTP Header 键 
 */
function mapHttpProxyHeaders(r, currentHttpHeaderKey) {
  const interceptorBeforeResult = inject_main.doBeforeMapHttpProxyHeader(r, currentHttpHeaderKey);
  if (interceptorBeforeResult.doneFlag) {
    return interceptorBeforeResult.result;
  }

  let result = r.headersIn[currentHttpHeaderKey];
  const fdnAppName = r.variables.fdn_app_name;
  switch (fdnAppName) {
    case 'portainer':
      if (currentHttpHeaderKey === 'Origin') {
        result = ''
      }
      break;
    default:
      break;
  }

  const interceptorOnFinishResult = inject_main.doOnFinishMapHttpProxyHeader(
    r,
    currentHttpHeaderKey,
    result
  );

  if (interceptorOnFinishResult.doneFlag) {
    return interceptorOnFinishResult.result;
  }

  return result;
}

export default {
  buildFdnAppRouteUpstream,
  buildFdnAppUpstream,
};
