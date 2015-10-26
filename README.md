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

Do a get request:
```js
  //simple get
  request(uri, function (error, url, body) {
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
