/**
 * fetch a url with certificate or proxy and return or stream response
 *
 * Created by Zougi on 19/12/2015.
 */


var url = require('url')
var http = require('http')
var https = require('https')
var extend = require('extend')

var request = {}

request.download = function (uri, opt, cb, stream, socket) {
  var parsedUrl = url.parse(uri)
  var isHttps = parsedUrl.protocol ? parsedUrl.protocol.indexOf('https') === 0 : true
  var options = {
    hostname : parsedUrl.hostname,
    port : parsedUrl.port,
    path : parsedUrl.path,
    rejectUnauthorized : false
  }

  if (request.proxy) {
    if (socket) { //isHttps
      options = {
        host: parsedUrl.hostname,
        path : parsedUrl.path,
        socket: socket, // using a tunnel
        agent: false    // cannot use a default agent
      }
    } else {
      var parsedProxy = url.parse(request.proxy)
      options = {
        host : parsedProxy.hostname,
        port : parsedProxy.port,
        path : uri,
        headers: {
          Host: parsedUrl.hostname
        },
        rejectUnauthorized : false
      }
    }
  }

  if (request.userAgent) {
    if (!options.headers) {
      options.headers = {}
    }
    options.headers['User-Agent'] = request.userAgent
  }

  if (isHttps && this.pfxFile && this.pfxPassword) {
    options.pfx = this.pfxFile,
      options.passphrase = this.pfxPassword
  }

  if (opt && opt.ReqPostData) {
    options.method = 'POST'
    if (!options.headers) {
      options.headers = {}
    }
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    options.headers['Content-Length'] = opt.ReqPostData.length
  }

  extend(options, opt)

  var req = (isHttps ? https : http)[(opt && opt.ReqPostData) ? 'request' : 'get'](options, function (res) {
    if (res.statusCode < 400 && res.headers.location) {
      //console.log('request-enterprise: Following redirect to ' + res.headers.location)
      var newUrl = res.headers.location
      if (newUrl.indexOf("/") === 0) {
        newUrl = (isHttps ? 'https://' : 'http://') + options.hostname + newUrl
      }
      return request.download(newUrl, opt, cb, stream, socket)
    }
    var data = ""

    if (!cb) {
      stream.resolve(res)
    } else {
      res.on('data', function (chunk) {
        data += chunk
      }).on('end', function () {
        var error = (res.statusCode === 200) ? null : res.statusCode
        cb(error, uri, data)
      })
    }
  })

  req.on('error', function(err) {
    //console.log('request-enterprise: ' + err.code + ': ' + err.message)
    if (request.proxy && !isHttps && err.code === 'EPROTO') {
      var proxyTmp = request.proxy
      request.proxy = undefined
      request.download(uri, opt, function (error, uri, data) {
        request.proxy = proxyTmp
        if (cb) cb(error, uri, data)
      }, stream)
    } else if (!cb) {
      stream.emit('error', err)
    }
    if (cb) cb(err.message)
  })

  if (opt && opt.ReqPostData) {
    req.write(opt.ReqPostData)
    req.end()
  }

}

module.exports = request
