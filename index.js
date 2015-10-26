/**
 * request module with windows ssl certificate support
 *
 * usage:
 * var request = require('./request-pfx').init({ name: "sso", pfxPath: "test.pfx", passphrase: "testpass"}).download
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
 */

//nodejs dependencies
var fs = require('fs')
var url = require('url')
var path = require('path')
var http = require('http')
var https = require('https')
var querystring = require('querystring')
var child_process = require('child_process')
var settings = require('./package.json').settings

//fetch url anyway
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var request = {}

/**
 * fetch a url with certificate and return response
 */
request.download = function (uri, postData, cb) {

    var parsedUrl = url.parse(uri)
    var isHttps = parsedUrl.protocol ? parsedUrl.protocol.indexOf('https') === 0 : true
    var options = {
      hostname : parsedUrl.hostname,
      port : parsedUrl.port,
      path : parsedUrl.path,
      rejectUnauthorized : false
    }

    if (process.env.HTTP_PROXY) {
      var parsedProxy = url.parse(process.env.HTTP_PROXY)
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

    if (isHttps && this.pfxFile && this.pfxPassword) {
      options.pfx = this.pfxFile,
      options.passphrase = this.pfxPassword
    }

    if (postData) {
      options.method = 'POST'
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
        return request.download(newUrl, postData, cb)
      }
      var data = "", dataLen = 0

      res.on('data', function (chunk) {
        data += chunk
      }).on('end', function () {
        var error = (res.statusCode === 200) ? null : res.statusCode
        cb(error, uri, data);
      });

    })

    req.on('error', function(e) {
      cb(e.message)
    })

    if (postData) {
      req.write(postData);
      req.end();
    }
}

module.exports = {
    init: function (certificate) {

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
    download: function (uri) {
      var cb, postData

      if (typeof arguments[1] === 'function') {
        cb = arguments[1]
      } else {
        if (arguments[1]) {
          postData = querystring.stringify(arguments[1])
        }
        cb = arguments[2]
      }
      request.download(uri, postData, cb)
    }
  }
