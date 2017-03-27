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
 * //or with pipes
 * request(uri).pipe(process.stdout)
 *
 * see README.md for more use cases and examples
 *
 * Created by Zougi on 26/10/2015.
 *
 */

var fs = require('fs')
var path = require('path')
var child_process = require('child_process')
var url = require('url')
var http = require('http')

var streamify = require('streamify')

var request = require('./request.js')

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

    //common temporary directories
    var systemTempDir = process.env.LOCALAPPDATA || process.env.TMPDIR || process.env.TEMP || process.env.TEMP
    if (systemTempDir) {
      try {
        var stats = fs.statSync(systemTempDir)
        if (stats.isDirectory()) {
          pfxFolder = systemTempDir
        }
      } catch (err) { }
    }

    var pfxPath = certificate.pfxPath.indexOf('\\') === -1 ?  path.join(pfxFolder, certificate.pfxPath) : certificate.pfxPath

    request.pfxPassword = certificate.passphrase

    fs.stat(pfxPath, function (err, stat) {
      if (err) {
        try {
          var systemShell = null, args = []

          if (/^win/.test(process.platform)) {
            systemShell = 'powershell.exe'

            args = [
              path.join(__dirname, 'exportCertificate.ps1'),
              "-certificateName", certificate.name,
              "-passphrase", certificate.passphrase,
              "-exportPath", pfxPath
            ]
          } else {
            systemShell = '/bin/sh'

            args = [
              path.join(__dirname, 'exportCertificate.sh'),
              certificate.name,
              certificate.passphrase,
              pfxPath
            ]
          }

          child_process.spawn(systemShell, args)
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
  download: function (uri /* ,opt, cb */) {
    var stream, opt, cb

    //arguments handle
    if (typeof arguments[1] === 'function') {
      cb = arguments[1]
    } else {
      opt = arguments[1]
      cb = arguments[2]
    }
    //rewrite callback if json output
    if (opt && opt.ReqJson && cb) {
      var args = [].concat.apply([], arguments)

      cb = function (error, uri, data) {
        if (data) {
          try {
            data = JSON.parse(data)
          } catch (e) {
            stream.emit('error', e)
          }
        }
        args[args.length - 1](error, uri, data)
      }
    }
    stream = streamify()

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
        request.download(uri, opt, cb, stream, socket)
      }).on('error', function(err) {
        //console.log('request-enterprise: ' + err.code + ': ' + err.message + '. try not to specify proxy, request will be faster')
        if (err.code === 'HPE_INVALID_CONSTANT') {
          request.proxy = null
          request.download(uri, opt, cb, stream)
        } else {
          stream.emit('error', err)
        }
      }).end()
    } else {
      request.download(uri, opt, cb, stream)
    }

    return stream
  }
}
