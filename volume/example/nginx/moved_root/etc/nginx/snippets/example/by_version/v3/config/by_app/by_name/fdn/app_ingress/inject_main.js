/**
 * 代理请求头映射拦截器处理结果
 * @typedef {Object} MapHttpProxyHeaderInterceptorResult
 * @property {boolean} doneFlag - 是否已经处理完成，true 表示处理完成，false 表示继续后续处理
 * @property {Record<string, string>} result - 如果 doneFlag 为 true ，则会使用 result 作为新的 Header 映射结果
 */

/**
 * 在 HTTP 代理请求头映射前抢先处理
 * @param r NGINX HTTP请求上下文
 * @param currentHttpHeaderKey 当前正在处理的 HTTP Header 键
 * @returns {MapHttpProxyHeaderInterceptorResult} 处理结果
 */
function doBeforeMapHttpProxyHeader(r, currentHttpHeaderKey) {
    return {
        doneFlag: false
    }
}

/**
 * 在 HTTP 代理请求头映射完成后处理
 * @param r NGINX HTTP请求上下文
 * @param currentHttpHeaderKey 当前正在处理的 HTTP Header 键
 * @param mapResult 默认映射结果
 * @returns {MapHttpProxyHeaderInterceptorResult} 处理结果
 */
function doOnFinishMapHttpProxyHeader(r, currentHttpHeaderKey, mapResult) {
    return {
        doneFlag: false
    }
}

export default {
    doBeforeMapHttpProxyHeader,
    doOnFinishMapHttpProxyHeader
}
