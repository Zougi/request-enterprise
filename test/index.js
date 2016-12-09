var should = require('chai').should(),
  path = require('path'),
  fs = require('fs'),
  requestpfx = require('../index'),
  request = requestpfx.init(null, process.env.HTTP_PROXY ? process.env.HTTP_PROXY : null).download

describe('#check simple get request works', function() {

  // it('returns body from internal website', function(done) {
  //   request('***REMOVED***', function (error, url, body) {
  //    if (!error) {
  //      body.should.exist
  //    }
  //    done()
  //   })
  // })

  it('returns body from an external website', function(done) {
    request('http://google.com', function (error, url, body) {
      if (!error) {
        body.should.exist
      }
      done()
    })
  })
})

// describe('#check simple post request works', function() {
//
//   it('returns body', function() {
//     //post
//     request(uri, { post: 'data' }, function (error, url, body) {
//      console.log(body)
//     })
//   })
//
// })


describe('#check simple get request works with pipes', function() {

  it('returns streamed body from external website', function(done) {
    var length = 0
    var stream = request('http://google.com')
    stream.on('readable', function() {
      var data = stream.read()
      if (data && data.length) {
        length += data.length
      }
    })
    stream.on('end', function () {
      length.should.exist
      done()
    })
  })

})

// describe('#check https get with certificate works', function() {

//   this.timeout(20000)

//   it('has certificate', function(done) {
//     request = requestpfx.init({ name: process.env.USERNAME, pfxPath: 'test.pfx', passphrase: 'testpass'}).download
//     var pfxFolder = __dirname
//     if (process.env.LOCALAPPDATA) {
//       var tmpDir = path.join(process.env.LOCALAPPDATA, 'Temp')
//       var stats = fs.statSync(tmpDir)
//       if (stats.isDirectory()) {
//         pfxFolder = tmpDir
//       }
//     }

//     setTimeout(function () {
//       var stats = fs.statSync(path.join(pfxFolder, 'test.pfx'))
//       stats.isFile().should.be.true
//       done()
//     }, 5000);

//   })

//   it('returns body', function(done) {
//     request('***REMOVED***', function (error, url, body) {
//       if (!error) {
//         body.should.exist
//       }
//       done()
//     })
//   })

// })

describe('#check gets error on 404', function() {

  it('with pipes', function(done) {
    request('http://nexus.wdf.sap.corp:8081/nexus/content/groups/build.snapshots/com/sap/npm/webi-jsapi/0.4.8-SNAPSHOT/maven-metadata.xml')
      .on('error', error => {
        error.should.exist
      }).on('end', function () {
        done()
      })
  })

  it('with callback', function(done) {
    request('http://nexus.wdf.sap.corp:8081/nexus/content/groups/build.snapshots/com/sap/npm/webi-jsapi/0.4.8-SNAPSHOT/maven-metadata.xml', function (error) {
      error.should.exist
      done()
    })
  })
})
