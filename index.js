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
 * request(uri, null, 'json', function (error, url, body) {
 *   if (!error) {
 *     console.log(body)
 *   }
 * })
 *
 */

var fs = require('fs')
var path = require('path')
var child_process = require('child_process')
var url = require('url')
var querystring = require('querystring')

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
  download: function (uri /* ,opt, cb */) {
    var stream, opt, cb

    //arguments handle
    if (typeof arguments[1] === 'function') {
      cb = arguments[1]
    } else {
      opt = arguments[1]
      if (opt && opt.ReqPostData) {
        opt.ReqPostData = querystring.stringify(arguments[1])
      }
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
        request.download(uri, opt, cb, stream, socket)
      }).end()
    } else {
      request.download(uri, opt, cb, stream)
    }

    var parseStream = null
    if (!cb && opt && opt.ReqParser && opt.ReqParser.key && opt.ReqParser.callback) {

      if (opt.ReqJson) {
        parseStream = require('clarinet').createStream()

        parseStream.on('error', function (e) {
          // unhandled errors will throw, since this is a proper node
          // event emitter.
          console.error('clarinet error!', e)
          // clear the error
          this._parser.error = null
          this._parser.resume()
        })

        var key = null
        parseStream.on('key', function (node) {
          if (node === opt.ReqParser.key) {
            key = node
          }
        })

        parseStream.on('value', function (node) {
          if (key && key === opt.ReqParser.key) {
            opt.ReqParser.callback(node)
            key = null
          }
        })
      } else {
        parseStream = require('sax').createStream(false)

        parseStream.on('error', function (e) {
          // unhandled errors will throw, since this is a proper node
          // event emitter.
          console.error('sax error!', e)
          // clear the error
          this._parser.error = null
          this._parser.resume()
        })
        var tagIsOpened = false
        parseStream.on('opentag', function (node) {
          if (opt.ReqParser.key === node.name) {
            tagIsOpened = true
            opt.ReqParser.callback(node)
          }
        })
        parseStream.on('text', function (text) {
          if (tagIsOpened) {
            opt.ReqParser.callback(text)
          }
        })
        parseStream.on('closetag', function (node) {
          if (opt.ReqParser.key === node.name) {
            tagIsOpened = false
          }
        })
      }
    }

    return parseStream ? stream.pipe(parseStream): stream
  }
}
