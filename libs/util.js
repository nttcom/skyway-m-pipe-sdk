const fetch = require('node-fetch');
const AbortController = require('abort-controller')
const { spawn } = require('child_process')

const NO_CHILD_PROCESS_LOG = !!process.env.NO_CHILD_PROCESS_LOG

/**
 * transform object into Base64 string
 *
 * @param {Object} obj
 * @return {String} - base64 encoded string
 */
function objToBase64( obj ) {
  const buff = new Buffer.from( JSON.stringify( obj ));

  return buff.toString('base64');
}

/**
 * transform Base64 string into object
 *
 * @param {string} str
 * @return {object}
 */
function base64ToObj( str ) {
  const buff = new Buffer.from(str, 'base64');

  return JSON.parse(buff.toString('ascii'));
}

/**
 * fetchWithTimeout
 *
 * By using abort control, we implemented request cancellation.
 * For more detail - https://drive.google.com/drive/u/1/folders/17ksi-wvQEELYKnn8QaL_16j1a9j0sk1L
 *
 * @params {string} url
 * @params {object} options
 * @params {number} [timeout=7000]
 *
 * @return {Promise<object>}
 *
 * @example
 * const res = await fetchWithTimeout( 'http://example.com', { method: "GET" } )
 * #=> when 7sec passed before response arrival, `timeout` error will be thrown.
 */
const fetchWithTimeout = (url, options, timeout=7000 ) => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timer = setTimeout( () => {
      controller.abort()
    }, timeout )

    const _options = Object.assign( {}, options, { signal: controller.signal })

    fetch( url, _options )
      .then(
        data => resolve( data ),
        err => reject( err )
      )
      .finally(() => {
        clearTimeout(timer);
      });
    })
}

/**
  * fetchWithReconnection
  *
  * This method will make reconnection when timeout happens.
  * When num of reconnection exceeds `MAX_RECONN`, this will raise error.
  *
  * @params {string} url - url
  * @params {object} options - fetch option
  * @params {number} [timeout=7000] - tiemout value
  * @params {number} [max=10] - max reconnection time
  * @params {Array<number>} [retryStatuses-[]] - statuses which will be retried
  * @params {Array<number>} [ignoreStatuses-[]] - statuses which will be ignored
  * @return {Promise<object|string>}
  *
  * @example
  *
  * const res = await fetchWithReconnection( "http://example.com", { method: "GET" } )
  */
const fetchWithReconnection = async ( url, options, timeout=7000, max=10, retryStatuses=[], ignoreStatuses=[] ) => {
  const duration = 1000
  let cnt = 0

  const _callback = async () => {
    try {
      const res = await fetchWithTimeout( url, options, timeout )

      if ( (res.status < 200 || res.status > 299) && !ignoreStatuses.includes(res.status) ) {
        const data = await res.text();

        const err = new Error( `[STATUS:${res && res.status}] Error on fetch - ${data}`)

        if( retryStatuses.includes(res.status) ) err.type = "retry"
        throw err;
      } else {
        return res
      }
    } catch(err) {
      cnt++
      // todo - check errno in network error
      if ( (  err.name === "AbortError" ||
              err.type === "retry" ||
              err.code === "ENOTFOUND" ||
              err.code === "ECONNRESET" ||
              err.code === "ECONNREFUSED" ) && cnt <= max ) {
        // ENOTFOUND    : cannot find target host ( e.g. dns error )
        // ECONNRESET   : disconnected connection for some reason
        // ECONNREFUSED : refused by host ( e.g. server port is not opened yet )
        console.warn( `fetchWithReconnection - reconnecting... [${cnt} / ${max}]` )
        console.warn( `  reason - ${err.message}`)

        await delay( duration )
        return await _callback()
      } else {
        // throw error since num of reconnection exceeds max value
        if (  err.name === "AbortError" ||
              err.type === "retry" ||
              err.code === "ENOTFOUND" ||
              err.code === "ECONNRESET" ||
              err.code === "ECONNREFUSED" ) err.type = "retries_exceeded"
        throw err
      }
    }
  }

  try {
    return await _callback()
  } catch(err) {
    throw err
  }
}



/**
 * delay
 *
 * @params {number} duration - e.g. 1000 (1 sec)
 *
 * @return {Promise<void>}
 *
 * @example
 * await delay(1000)
 * #=> after 1 sec, next line will be called.
 */
const delay = duration => {
  return new Promise( ( resolve ) => {
    setTimeout( () => {
      resolve( duration )
    }, duration )
  })
}


/**
 * spawnProcess
 *
 * @params {string} title
 * @params {string} cmd
 * @params {object} env
 *
 * @return {Promise<subprocess>
 *
 * @example
 *
 * const proc = await spawnProcess("ls", "ls -l -a")
 */
function spawnProcess( title, cmd, env ) {
  return new Promise( (resolve) => {
    const arr = cmd.split(" ")
      , process = arr[0]
      , args = arr.slice(1)
    const proc = spawn( process, args, { env })

    let started = false

    proc.stdout.on('data', msg => {
      if( !started ) {
        started = true
        resolve( proc )
      }
      if(!NO_CHILD_PROCESS_LOG)
        console.warn( title + " : " + msg.toString() )
    })
    proc.stderr.on('data', msg => {
      if( !started ) {
        started = true
        resolve( proc )
      }
      if(!NO_CHILD_PROCESS_LOG)
        console.warn( title + " : " + msg.toString() )
    })
  })
}

module.exports = {
  objToBase64,
  base64ToObj,
  fetchWithTimeout,
  fetchWithReconnection,
  delay,
  spawnProcess
}
