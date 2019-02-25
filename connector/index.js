const mpipeTraceContext = process.env.MPIPE_TRACE_CONTEXT || null
const IN_HOST  = process.env.IN_HOST
const IN_PORT  = process.env.IN_PORT
const OUT_PORT = process.env.OUT_PORT
const TOKEN    = process.env.TOKEN
const trace = process.env.TRACE // when `TRACE` is `off`, we will not start tracer

const MPIPE_STREAM_STATUS = 'MPIPE_STREAM_STATUS'

/////////////////////////////////////////////////////////////////////////////////////
// BEGIN: initialize trace agent
//
// note: Do not require `@google-cloud/trace-agent` from outside of this library
// It will make confliction error state since `trace-agent` has a monkey patch code
//
// Please import `tracer` instance of this library and use it, if you want to use
// `@google-cloud/trace` feature from outside of this code.
/////////////////////////////////////////////////////////////////////////////////////

let tracer

if( trace !== 'off' ) {
  // On GKE
  tracer = require('@google-cloud/trace-agent').start({})
} else {
  tracer = {}
  tracer.runInRootSpan = ( params, cb ) => {
    // we will not care params, simply execute callback func
    // with `span` equal `null`
    cb(null)
  }
}
/////////////////////////////////////////////////////////////////////////////////////
// FINISH: initialize trace agent
/////////////////////////////////////////////////////////////////////////////////////

const EventEmitter = require('events')
const path = require('path');
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const {
  is_h264_keyframe
} = require('./media-utils');

const PROTO_PATH = path.join(__dirname, './protos/mpipe-stream.proto');
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const mpipeStream = protoDescriptor.mpipeStream;


/**
 * @example
 * const input = new InputStream()
 * input.start({ host: 'localhost', port: 10000, token: 'some-token' });
 * input.on('data', data => console.log(data));
 *
 */
class InputStream extends EventEmitter {
  constructor() {
    super();

    this.client = null;
    this.stream = null;
    this.mpipeStreamStatus = '';

    this.params = {
      host: null,
      port: null,
      token: null
    };
  }

  /**
   * @param {object} params
   * @param {string} params.host
   * @param {number} params.port
   * @param {string} params.token
   */
  _setParams( { host, port, token } ) {
    // todo - validation
    this.params = Object.assign({}, { host, port, token });
  }

  _start() {
    try {
      const dest = `${this.params.host}:${this.params.port}`;
      const token = this.params.token;
      const client = new mpipeStream.Interface(dest, grpc.credentials.createInsecure());
      const stream = client.mediaPipeline({ token });

      stream
        .on('data', data => {
          this.emit('data', {
            type: data.type,
            meta: data.meta,
            payload: data.payload
          })
        })
        .on('end', () => {
          this.emit('end');
        })
        .on('metadata', metadata => {
          const arr = metadata.get( MPIPE_STREAM_STATUS )

          if( Array.isArray(arr) && arr.length === 1 ) {
            this.mpipeStreamStatus = arr[0]
            this.emit('mpipeStreamStatus', this.mpipeStreamStatus);
          }
        })
        .on('status', status => {
          this.emit('status', status);
        })
        .on('error', err => {
          this.emit('Error', err);
        })

      // when mpipeStreamStatus is not `200` after 250msec,
      // we will start reconnection to server.
      setTimeout( () => {
        if(this.mpipeStreamStatus !== '200') {
          stream.cancel()
          client.close()
          this._start()
        } else {
          this.client = client
          this.stream = stream
        }
      }, 250)
    } catch(err) {
      throw err
    }
  }

  /**
  * @param {object} params
  * @param {string} params.host
  * @param {number} params.port
  * @param {string} params.token
  */
  async start( { host, port, token } = { host: IN_HOST, port: IN_PORT, token: TOKEN } ) {
    // todo - we need to add name of container and clientID for support purpose
    tracer.runInRootSpan( { name: `START InputStream`, traceContext: mpipeTraceContext }, async span => {
      if( span ) {
        span.addLabel('host', host)
        span.addLabel('port', port)
        span.addLabel('token', token)
      }

      try {
        this._setParams( { host, port, token } );
        this._start();

        if( span ) {
          this.on( 'mpipeStreamStatus', mpipeStreamStatus => {
            span.addLabel('mpipeStreamStatus', mpipeStreamStatus )
            span.endSpan()
          });
        }
      } catch(err) {
        console.warn(err)

        if( span ) {
          span.addLabel( 'status', 500 )
          span.addLabel( 'errMessage', err.message )
          span.endSpan()
        }
      }
    })
  }

  /**
   * stop
   *
   */
  stop() {
    if(this.stream) this.stream.cancel();
    if(this.client) this.client.close();
  }
}



/**
 *
 * @example
 * const output = new OutputStream();
 * output.start({ port: 10000, token: 'some-token' });
 * output.write({ type: 'test-stream' });
 *
 */
class OutputStream {
  constructor() {
    this.token   = '';
    this.port    = null;
    this.server  = null;
    this.clients = [];

    this.flagChkKeyFrame = false;
  }

  /**
   * Handler for gRPC client request (mediaPipeline)
   *
   * @param {object} client - grpc client object
   * @private
   *
   */
  _clientRequestHandler(client) {
    if( client.request.token === this.token ) {
      this.clients.push(client);
      console.log('connection established with client');

      const metadata = new grpc.Metadata()
      metadata.set( MPIPE_STREAM_STATUS, '200' )

      client.sendMetadata( metadata )

      client.on('cancelled', () => {
        this.clients = this.clients.filter( c => (c !== client))
        console.log('connection canceled with client');
      });
    } else {
      client.end();
      console.warn('invalid token found for client request');
    }
  }

  /**
   * Start output stream server
   *
   * @param {object} params
   * @param {number} params.port
   * @param {string} params.token
   * @param {boolean} flagChkKeyFrame
   *
   */
  start({ port, token } = { port: OUT_PORT, token: TOKEN }, flagChkKeyFrame) {
    // todo - we need to add name of container and clientID for support purpose
    tracer.runInRootSpan( { name: `START OutputStream`, traceContext: mpipeTraceContext }, async span => {
      if( span ) {
        span.addLabel('port', port)
        span.addLabel('token', token)
      }

      try {
        this.port = port
        this.token = token
        this.flagChkKeyFrame = !!flagChkKeyFrame

        this.server = new grpc.Server();
        this.server.addService(mpipeStream.Interface.service, {
          mediaPipeline: this._clientRequestHandler.bind(this)
        });
        this.server.bind(`0.0.0.0:${this.port}`, grpc.ServerCredentials.createInsecure());
        this.server.start();

        console.log(`server started on port ${this.port}, token = ${this.token}`);

        if( span ) {
          span.addLabel( 'status', 200 )
          span.endSpan()
        }
      } catch(err) {
        if( span ) {
          span.addLabel( 'status', 500 )
          span.addLabel( 'errMessage', err.message )
          span.endSpan()
        }
      }
    })
  }

  /**
   * stop output stream server
   *
   */
  stop() {
    this.clients.length = 0;
    if(this.server) this.server.forceShutdown();
  }

  /**
   * @param {object} obj
   * @param {string} obj.type
   * @param {string} obj.meta
   * @param {Buffer} obj.payload
   *
   */
  write( obj ) {
    this.clients.forEach( client => {
      // if( this.flagChkKeyFrame ) {
      //   console.log( is_h264_keyframe(obj.payload) );
      // }
      if(
        this.flagChkKeyFrame &&
        ( client.kf_recved || is_h264_keyframe(obj.payload) )
      ) {
        client.kf_recved = true
      }

      if( !this.flagChkKeyFrame || client.kf_recved ) {
        client.write({
          token: this.token,
          type:  obj.type,
          meta:  obj.meta,
          payload: obj.payload
        });
      }
    });
  }
}


module.exports = {
  InputStream,
  OutputStream,
  tracer
}
