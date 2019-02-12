const {
  fetchWithTimeout,
  fetchWithReconnection,
  delay,
  base64ToObj,
  objToBase64,
  spawnProcess
} = require('./util')

let docker

beforeAll( async () => {
  await delay( 3000 )
  docker = await spawnProcess(
    'event-gateway',
    'docker run -p 4000:4000 -p 4001:4001 --rm serverless/event-gateway:0.9.1 -dev -log-level DEBUG'
  )
})

afterAll( async () => {
  if( docker ) docker.kill('SIGHUP')
})



describe('fetchWithTimeout test', () => {
  it('will raise error when it exceeds timeout period', done => {
    fetchWithTimeout('http://127.0.0.2', { method: "GET" }, 500)
      .catch( err => {
        expect( err.message ).toBe("The user aborted a request.")
        done()
      })
  })

  it('will raise ENOTFOUND error when we specify unexisted hostname', done => {
    // default timeout is 7 sec
    fetchWithTimeout('http://localhost2', { method: "GET" })
      .catch( err => {
        expect( err.code ).toBe("ENOTFOUND")
        done()
      })
  })

  it('will raise ECONNREFUSED error when we specify unexisted port', done => {
    fetchWithTimeout('http://localhost', { method: "GET" })
      .catch( err => {
        expect( err.code ).toBe("ECONNREFUSED")
        done()
      })
  })

  it('will return response when we use existing url', done => {
    fetchWithTimeout('http://localhost:4001/v1/status', { method: "GET" })
      .then( res => res.text() )
      .then( obj => {
        expect(obj).toEqual("")
        done()
      })
  })
})

describe('fetchWithReconnection test', () => {
  it('will raise timeout and aborted error when unexist address is set', done => {
    fetchWithReconnection('http://127.0.0.2', { method: "GET" }, 100, 2)
      .catch( err => {
        expect( err.type ).toBe("timeout")
        expect( err.message ).toMatch("aborted")
        done()
      })
  })

  it('will raise timeout and ENOTFOUND error when unexist hostname is set', done => {
    fetchWithReconnection('http://hostname', { method: "GET" }, 100, 2)
      .catch( err => {
        expect( err.type ).toBe("timeout")
        expect( err.message ).toMatch("ENOTFOUND")
        done()
      })
  })

  it('will raise timeout and ECONNREFUSED error when unexist port is set', done => {
    fetchWithReconnection('http://localhost', { method: "GET" }, 100, 2)
      .catch( err => {
        expect( err.type ).toBe("timeout")
        expect( err.message ).toMatch("ECONNREFUSED")
        done()
      })
  })

  it('will respond data when url is exist', done => {
    fetchWithReconnection('http://localhost:4001/v1/status', { method: "GET" })
      .then( res => res.text() )
      .then( text => {
        expect(text).toBe("")
        done()
      })
  })
})

describe('delay test', () => {
  it('will call next line, when specified duration time passed', async done => {
    const callback = jest.fn()

    Promise.resolve().then(() => {
      callback()
    });

    expect( callback ).not.toBeCalled()
    const ret = await delay(100)
    expect( callback ).toBeCalled()
    expect( ret ).toBe( 100 )
    done()
  })
})

describe('base64ToObj test', () => {
  const test = 'eyJtc2ciOiJ0ZXN0In0='
    , expected = { "msg": "test" }

  it('will transform base64 string to object', () => {
    const res = base64ToObj( test )
    expect( res ).toEqual( expected )
  })
})

describe('objToBase64 test', () => {
  const test = { "msg": "test" }
    , expected = 'eyJtc2ciOiJ0ZXN0In0='

  it('will transform object to base64 string', () => {
    const res = objToBase64( test )
    expect( res ).toBe( expected )
  })
})
