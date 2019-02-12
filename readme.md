# skyway-m-pipe-sdk

SDK of SkyWay Media Pipeline Factory (M-PIPE)

## Install

```
$ npm insatll skyway-m-pipe-sdk
```

## snipets

### Connector

Connector SDK of M-PIPE components

* Input Stream

```js
const { InputStream } = require('skyway-m-pipe-sdk/connector');

const inputStream = new InputStream();

// you need to set hostname and port number of previous component
// please make sure that same token with previous as well
inputStream.start({ host: inHost, port: inPort, token });

inputStream.on( 'data', data => {
  // #=> data.type - arbitrary type data in string format
  //     data.meta - arbitrary meta data in string format
  //     data.payload - arbitrary payload data in binary format
})
```

* Output Stream

```js
const { OutputStream } = require('skyway-m-pipe-sdk/connector');

const outputStream = new OutputStream();

outputStream.start({ port: outPort, token })

outputStream.write({
   type: 'test-stream',
   meta: JSON.stringify({ name: test, ts: Date.now() }),
   payload: Buffer.from( 'Hello world' )
})
```

### EventGateway

Interface SDK of event gateway of M-PIPE

* subscribe

```js
const EventGateway = require('m-pipe-sdk/event-gateway')

const ufUrl = `http://${hostname}:${port}`
const eventGateway = new EventGateway( { host: evHost } )

// register functions
await eventGateway.registUrl( 'statem.noticePeerid',    `${ufUrl}/peerid` )
await eventGateway.registUrl( 'statem.noticeConnected', `${ufUrl}/connected` )
await eventGateway.registUrl( 'statem.reqClosing',      `${ufUrl}/close`  )

// subscribe bindings
await eventGateway.subscribe( 'webrtc.session.ready',      'statem.noticePeerid'  )
await eventGateway.subscribe( 'webrtc.session.connected',  'statem.noticeConnected' )
await eventGateway.subscribe( 'webrtc.session.closing',    'statem.reqClosing'    )
```

* emit

```js
const EventGateway = require('m-pipe-sdk/event-gateway')
const eventGateway = new EventGateway( { host: evHost } )

eventGateway.emit('webrtc.session.closed', { token })
```

## test

> You need to prepare docker environment for testing

### unit test and integration test with Event Gateway

```
npm run test
```

---
Copyright. NTT Communications Corporation All rights reserved.
