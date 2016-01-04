# Request Enterprise
http(s) wrapper for nodejs, dedicated to enterprise networks
proxy & sso support

## Installation
```
  npm install request-enterprise
```

## Description
Simplify use of get/post requests especially behind a proxy or requiring certificate authentication.
Follow links if there header contains redirection location information
For https on windows or mac, if certificate name is specified, extract the certificate from user's certificate store and execute the request with the certificate
Get the result as a stream or in a callback

This module works great with [sax](https://github.com/isaacs/sax-js) and [oboe](https://github.com/jimhigson/oboe.js)

Note: this module has no intention to replace the popular [request](https://github.com/request/request) module but to offer one similar, targeted for those of us who work in big companies

## Usage
To activate https certificate support call init method with params name, pfxPath, passphrase
```js
  var request = require('./request-enterprise').init({ name: "sso", pfxPath: "test.pfx", passphrase: "testpass"}).download
```

To configure a proxy, pass the url of the proxy in second argument:
```js
  var request = require('./request-enterprise').init(null, 'http://<proxy>:<port>').download
```

Configure User-Agent with third argument:
```js
  var request = require('./request-enterprise').init(null, null,
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.34 Safari/534.24').download
```

Do a get request:
```js
  //simple get
  request(uri, function (error, url, body) {
   if (!error) {
     console.log(body)
   }
  })
```

Do a get request asynchronously:
```js
  //get with streamed response
  request(uri).pipe(process.stdout)
```

Do a post request:
```js
  //post
  request(uri, { ReqPostData: {post: 'data'} }, function (error, url, body) {
   console.log(body)
  })
```

Do a get request with json result as object (works only with callback, to use with pipes, use oboe):
```js
  request(uri, { ReqJson: true }, function (error, url, json) {
   if (!error) {
     console.log(json)
   }
  })
```

Parse Json as it is received (with streams):
```js
  var request = require('request-enterprise').download
  var oboe = require('oboe')
  var streamRequest = request('https://api.github.com/search/repositories?sort=stars&order=desc&q=request')
  var parser = oboe(streamRequest)

  streamRequest.on('error', function (error) {
    logger.error(error)
  })

  parser.node('items.*', function(item, path) {
    console.log(item)
  })
```
