const EventEmitter = require('events')
const express = require('express')
const bodyParser = require('body-parser')
const EventGateway = require('./index')

class TestServer extends EventEmitter {
  constructor( props ) {
    super( props )
    this.app = express()
    this.app.use(bodyParser.json({ type: 'application/*+json'} ))

    this.app.post("/", (req, res) => {
      this.emit("data", req.body.data)
      res.status(204).send()
    })
  }

  start() {
    return new Promise( (resolve, reject) => {
      try {
        const httpServer = this.app.listen(subscribePort, () => {
          console.log( `server started on port ${subscribePort}`)
          resolve(httpServer)
        })
      } catch(err) {
        reject( err )
      }
    })
  }
}

const subscribePort = 4002
const subscribeHost = "host.docker.internal"
const subscribeUrl = `http://${subscribeHost}:${subscribePort}`



let eg

beforeEach( async () => {
  eg = new EventGateway()
  await eg.clean()
})

afterEach( () => {
  eg = null
})

/**
 * Testing policy
 *
 * Normal test : we will not check response object from event-gateway. Since
 *   - we will not specify rensponse format in our manual. Just writing link of event-gateway
 *   - it will be increasing const of maintanance of testing code
 *   . We will just check a count of list to check whether success or not.
 * Error test : check status code from error message
 *
 */
describe('function test', () => {
  test('registUrl()', async () => {
    let list = await eg.listFunctions()
    expect( list.functions ).toHaveLength( 0 )

    await eg.registUrl("testfunc", subscribeUrl)
    list = await eg.listFunctions()
    expect( list.functions ).toHaveLength( 1 )

    await eg.registUrl("testfunc2", subscribeUrl)
    list = await eg.listFunctions()
    expect( list.functions ).toHaveLength( 2 )
  })

  test('deleteFunction()', async () => {
    await eg.registUrl("testfunc", subscribeUrl)
    await eg.deleteFunction("testfunc")
    const list = await eg.listFunctions()
    expect( list.functions ).toHaveLength( 0 )
  })

  test('registUrl() will throw 409 error when specified same functionId', async () => {
    await eg.registUrl("testfunc", subscribeUrl)

    let mesg = false
    try {
      await eg.registUrl("testfunc", subscribeUrl)
    } catch(err) {
      mesg = err.message
    }
    expect( mesg ).toMatch("409")

    let list = await eg.listFunctions()
    expect( list.functions ).toHaveLength( 1 )
  })
})

describe("event test", () => {
  test("createEvent()", async () => {
    await eg.createEvent("testevent")
    let list = await eg.listEvents()
    expect( list.eventTypes ).toHaveLength( 1 )

    await eg.createEvent("testevent2")
    list = await eg.listEvents()
    expect( list.eventTypes ).toHaveLength( 2 )
  })

  test("deleteEvent()", async () => {
    await eg.createEvent("testevent")
    let list = await eg.listEvents()
    expect( list.eventTypes ).toHaveLength( 1 )

    await eg.deleteEvent("testevent")
    list = await eg.listEvents()
    expect( list.eventTypes ).toHaveLength( 0 )
  })

  test("createEvent() will throw 409 error, when same eventType is specified", async () => {
    await eg.createEvent("testevent")

    let mesg = false
    try {
      await eg.createEvent("testevent")
    } catch(err) {
      mesg = err.message
    }

    expect( mesg ).toMatch("409")
    const list = await eg.listEvents()
    expect( list.eventTypes ).toHaveLength( 1 )
  })
})

describe("subscribe test", () => {
  test("subscribe()", async () => {
    await eg.createEvent("testevent")
    await eg.registUrl("testfunc", subscribeUrl)
    await eg.subscribe("testevent", "testfunc")
    const list = await eg.listSubscriptions()
    expect( list.subscriptions ).toHaveLength(1)
  })

  test("unsubscribe()", async () => {
    await eg.createEvent("testevent")
    await eg.registUrl("testfunc", subscribeUrl)
    const res = await eg.subscribe("testevent", "testfunc")

    let list = await eg.listSubscriptions()
    expect( list.subscriptions ).toHaveLength(1)

    await eg.unsubscribe(res.subscriptionId)

    list = await eg.listSubscriptions()
    expect( list.subscriptions ).toHaveLength(0)
  })

  test("subscribe will returs 400 status when eventType is not exist", async () => {
    await eg.registUrl("testfunc", subscribeUrl)

    let message
    try {
      await eg.subscribe("testevent", "testfunc")
    } catch(err) {
      message = err.message
    }
    expect(message).toMatch("400")

    const list = await eg.listSubscriptions()
    expect( list.subscriptions ).toHaveLength(0)

  }, 30000)

  test("subscribe will succeed when createEvent() was delayed", async () => {
    const eg400 = new EventGateway({ retryStatuses: [400] })
    await eg400.clean()

    setTimeout( async () => {
      await eg400.createEvent("testevent")
    }, 2000)

    await eg400.registUrl("testfunc", subscribeUrl)
    await eg400.subscribe("testevent", "testfunc")

    const list = await eg400.listSubscriptions()
    expect( list.subscriptions ).toHaveLength(1)

  })

  test("registUrl will succeed when it is called twice", async () => {
    const eg409 = new EventGateway({ ignoreStatuses: [409] })
    await eg409.clean()

    await eg409.registUrl("testfunc", subscribeUrl)
    await eg409.registUrl("testfunc", subscribeUrl)

    const list = await eg409.listFunctions()
    expect( list.functions ).toHaveLength(1)
  })

  test("subscribe will succeed when it is called twice", async () => {
    const eg409 = new EventGateway({ ignoreStatuses: [409] })
    await eg409.clean()

    await eg409.createEvent("testevent")
    await eg409.registUrl("testfunc", subscribeUrl)
    await eg409.subscribe("testevent", "testfunc")
    await eg409.subscribe("testevent", "testfunc")

    const list = await eg409.listSubscriptions()
    expect( list.subscriptions ).toHaveLength(1)
  })
})

describe("emit test", () => {
  test("emit()", async done => {
    const testServer = new TestServer()
    const http = await testServer.start()

    const message = {"mesg": "hello"}

    testServer.on("data", data => {
      expect( data ).toEqual( message )
      http.close()
      done()
    })

    await eg.createEvent("testevent")
    await eg.registUrl("testfunc", subscribeUrl)
    await eg.subscribe("testevent", "testfunc")
    await eg.emit("testevent", message)
  })
})

