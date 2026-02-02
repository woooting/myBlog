export default defineNitroPlugin((nitroApp) => {
  nitroApp.h3App.options.onError = (error, event) => {
    if (event.node.res.headersSent) {
      return
    }
    const statusCode = error.statusCode || 500
    const message = error.message || 'Internal Server Error'
    event.node.res.statusCode = statusCode

    const response = {
      success: false,
      code: statusCode,
      message,
      path: event.path,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }

    event.node.res.setHeader('Content-Type', 'application/json')
    event.node.res.end(JSON.stringify(response))
  }
})
