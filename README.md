# Requestpfx
request module with windows https/ssl certificate support

## Description
Execute simple get/post request with follow links on
For https, exctract windows certificate from user's certificate store and execute the request with the certificate


## Usage
To activate https certificate support call init method with params name, pfxPath, passphrase
```js
  var request = require('./request-pfx').init({ name: "sso", pfxPath: "test.pfx", passphrase: "testpass"}).download
```

To configure a proxy pass the url of the proxy in second argument:
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

Do a get request with json result:
```js
  //simple get
  request(uri, 'JSON', function (error, url, body) {
   if (!error) {
     console.log(body)
   }
  })
```

Do a post request:
```js
  //post
  request(uri, { post: 'data' }, function (error, url, body) {
   console.log(body)
  })
```

Do a post request with json result:
```js
  //post
  request(uri, { post: 'data' }, 'JSON', function (error, url, body) {
   console.log(body)
  })
```

