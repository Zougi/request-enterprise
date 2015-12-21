# Request Enterprise
http(s) wrapper dedicated to enterprise networks
proxy & sso support

## Description
Simplify use of get/post requests especially behind a proxy or requiring certificate authentication.
Follow links if there header contains redirection location information
For https on windows, if certificate name is specified, extract the certificate from user's certificate store and execute the request with the certificate
Get the result as a stream or in a callback

To parse streams on the fly, this module uses [sax](https://github.com/isaacs/sax-js) for DOM elements and [clarinet](https://github.com/dscape/clarinet) for json

Note: this module has no intention to replace the popular [request](https://github.com/request/request) module but to offer one similar, targeted for those of us who work in big companies

## Usage
To activate https certificate support call init method with params name, pfxPath, passphrase
```js
  var request = require('./request-pfx').init({ name: "sso", pfxPath: "test.pfx", passphrase: "testpass"}).download
```

To configure a proxy, pass the url of the proxy in second argument:
```js
  var request = require('./request-pfx').init(null, 'http://<proxy>:<port>').download
```

Configure User-Agent with third argument:
```js
  var request = require('./request-pfx').init(null, null,
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

Do a get request with json result as object:
```js
  request(uri, { ReqJson: true }, function (error, url, json) {
   if (!error) {
     console.log(json)
   }
  })
```

Parse HTML DOM as it is received (with streams):
```js
  request('http://google.com', { ReqParser: { key: 'A', callback: function (node) {
    console.log(node)
  }}})
```

Parse Json as it is received (with streams):
```js
  request('http://google.com', { ReqJson: true, ReqParser: { key: 'A', callback: function (node) {
    console.log(node)
  }}})
```
