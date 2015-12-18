/**
 * http/https requests wrapper that target enterprise networks
 * - ssl certificate support (tested on windows only)
 * - proxy support
 *
 * usage:
 * var request = require('./request-pfx')
 *   .init({ name: "sso", pfxPath: "test.pfx", passphrase: "testpass"}, 'http://proxy:port', 'myuserAgent/Version')
 *   .download
 *
 * //simple get
 * request(uri, function (error, url, body) {
 *   if (!error) {
 *     console.log(body)
 *   }
 * })
 *
 * //post
 * request(uri, { post: 'data' }, function (error, url, body) {
 *   console.log(body)
 * })
 *
 * //get with json result parsed and returned as object
 * request(uri, null, true, function (error, url, body) {
 *   if (!error) {
 *     console.log(body)
 *   }
 * })
 *
 */

//nodejs dependencies
var fs = require('fs')
var url = require('url')
var path = require('path')
var http = require('http')
var https = require('https')
var querystring = require('querystring')
var child_process = require('child_process')
var util = require('util')
var stream = require('stream')
var settings = require('./package.json').settings
var streamify = require('streamify')

//fetch url anyway
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var request = {}

/**
 * fetch a url with certificate and return response
 */
request.download = function (uri, postData, cb, stream, socket) {
  var parsedUrl = url.parse(uri)
  var isHttps = parsedUrl.protocol ? parsedUrl.protocol.indexOf('https') === 0 : true
  var options = {
    hostname : parsedUrl.hostname,
    port : parsedUrl.port,
    path : parsedUrl.path,
    rejectUnauthorized : false
  }
  var self = this
  request.chunk = ""

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

  if (postData) {
    options.method = 'POST'
    if (!options.headers) {
      options.headers = {}
    }
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    options.headers['Content-Length'] = postData.length
  }

  var req = (isHttps ? https : http)[postData ? 'request' : 'get'](options, function (res) {
    if (res.statusCode < 400 && res.headers.location) {
      //console.log('Following redirect to ' + res.headers.location)
      var newUrl = res.headers.location
      if (newUrl.indexOf("/") === 0) {
        newUrl = (isHttps ? 'https://' : 'http://') + options.hostname + newUrl
        //console.log(newUrl)
      }
      return request.download(newUrl, postData, cb, stream, socket)
    }
    var data = "", dataLen = 0

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

  req.on('error', function(e) {
    if (!isHttps && request.proxy && e.code == 'EPROTO') {
      var proxyTmp = request.proxy
      request.proxy = undefined
      request.download(uri, postData, function (error, uri, data) {
        request.proxy = proxyTmp
        cb(error, uri, data)
      })
    }
    if (cb) cb(e.message)
  })

  if (postData) {
    req.write(postData)
    req.end()
  }
}

module.exports = {
  init: function (certificate, proxy, userAgent) {

    request.proxy = proxy ? proxy : null
    request.userAgent = userAgent ? userAgent : null

    if (!certificate || (!certificate && !certificate.pfxPath)) {
      request.pfxFile = null
      request.pfxPassword = null
      return this
    }

    //folder where pfx will be extracted
    var pfxFolder = __dirname
    if (process.env.LOCALAPPDATA) {
      var tmpDir = path.join(process.env.LOCALAPPDATA, 'Temp')
      var stats = fs.statSync(tmpDir)
      if (stats.isDirectory()) {
        pfxFolder = tmpDir
      }
    }
    var pfxPath = certificate.pfxPath.indexOf('\\') === -1 ?  path.join(pfxFolder, certificate.pfxPath) : certificate.pfxPath

    request.pfxPassword = certificate.passphrase

    fs.stat(pfxPath, function (err, stat) {
      if (err) {
        try {
          var args = [
            path.join(__dirname, 'exportCertificate.ps1'),
            "-certificateName", certificate.name,
            "-passphrase", certificate.passphrase,
            "-exportPath", pfxPath
          ]
          //console.log('exec powershell')
          child_process.spawn("powershell.exe", args)
            .on('close', function (error, output) {
              //console.log(error ? 'error generating certificate: '+ error : 'success')
              if (!error) {
                request.pfxFile = fs.readFileSync(pfxPath)
              }
            })
        } catch (exception) {
          //console.log(exception)
        }
      } else {
        request.pfxFile = fs.readFileSync(pfxPath)
      }
    })
    return this
  },
  download: function (uri /* ,postData, json, cb */) {
    var stream, cb, postData,
      jsonTag = 'json',
      json = false,
      self = this

    //arguments handle
    if (typeof arguments[1] === 'function') {
      cb = arguments[1]
    } else if (typeof arguments[2] === 'function') {
      if (typeof arguments[1] === 'object') {
        postData = querystring.stringify(arguments[1])
      } else if (arguments[1].toLowerCase() === jsonTag) {
        json = true
      }
      cb = arguments[2]
    } else {
      if (arguments[1]) {
        postData = querystring.stringify(arguments[1])
      }
      if (arguments[2] && arguments[2].toLowerCase() === jsonTag) {
        json = true
      }
    }

    //rewrite callback if json output
    if (json && arguments[3]) {
      var args = [].concat.apply([], arguments)

      cb = function (error, uri, data) {
        if (data) {
          try {
            data = JSON.parse(data)
          } catch (e) {
            console.log(e)
          }
        }
        args[args.length - 1](error, uri, data)
      }
    }

    if (!cb) {
      stream = streamify()
    }

    var parsedUrl = url.parse(uri)
    var isHttps = parsedUrl.protocol ? parsedUrl.protocol.indexOf('https') === 0 : true
    if (request.proxy && isHttps) {
      //for http://proxy, like there are in corporations, create an https tunnel
      var parsedProxy = url.parse(request.proxy)
      http.request({
        host: parsedProxy.hostname,
        port: parsedProxy.port,
        method: 'CONNECT',
        path: parsedUrl.hostname + ':443'
      }).on('connect', function(res, socket) {
        request.download(uri, postData, cb, stream, socket)
      }).end()
    } else {
      request.download(uri, postData, cb, stream)
    }

    return stream
  }
}
