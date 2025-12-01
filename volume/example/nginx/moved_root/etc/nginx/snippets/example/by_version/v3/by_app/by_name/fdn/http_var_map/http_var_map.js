const domainRegex = /^(?:[a-z0-9-]+\.)*([a-z]{2,})$/i

function getAccessLogFileName(r) {
  // 能提取出 fdn_app_name 时已经符合合法域名的要求
  if (r.variables["fdn_app_name"]) {
    return `access_app_${fdn_app_name}.log`
  }

  // 能匹配上 SSL 证书的有效域名
  if (r.variables["fdn_ssl_domain_name"]) {
    return `access_tls_${fdn_ssl_domain_name}.log`
  }

  // 纯 HTTP 请求但是 Host 有合法域名的
  if (domainRegex.test(r.variables['clean_host'])) {
    return 'access_plain_http.log'
  }

  // 未知的请求 例如纯 IP 地址访问
  return 'access.log'
}

export default {
  getAccessLogFileName
}