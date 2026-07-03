export function getErrorMessage(error, fallback = '操作失败') {
  const data = error?.response?.data

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message
  }

  if (typeof data?.detail === 'string' && data.detail.trim()) {
    return data.detail
  }

  const firstDetail = Array.isArray(data?.detail) ? data.detail[0] : null
  if (typeof firstDetail?.msg === 'string' && firstDetail.msg.trim()) {
    return firstDetail.msg
  }

  const firstError = Array.isArray(data?.details?.errors) ? data.details.errors[0] : null
  if (typeof firstError?.message === 'string' && firstError.message.trim()) {
    return firstError.message
  }

  if (error?.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试'
  }

  if (!error?.response) {
    return '网络连接失败，请检查后重试'
  }

  return fallback
}
