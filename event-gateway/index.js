const fetch = require('node-fetch');
const uuidv4 = require('uuid/v4');

const defaultProps = {
  protocol: 'http',
  host: '127.0.0.1',
  port: 4000,
  ctrlPort: 4001,
  space: 'default',
  source: 'https://serverless.com/event-gateway/#transformationVersion=0.1',
  cloudEventsVersion: '0.1'
}

class EventGateway {
  constructor( props ) {
    this.props = Object.assign( {}, defaultProps, props )
  }

  /**
   * regist URL for event gateway
   *
   * @param {string} functionId
   * @param {string} url
   * @return {Promise<object}>
   *
   * @method EventGateway#registUrl
   */
  async registUrl(functionId, url) {
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.ctrlPort}/v1/spaces/${this.props.space}/functions`

    const body = {
      functionId,
      type: 'http',
      provider: {
        url
      }
    }

    return await this._post( endpoint, body )
  }

  /**
   * list functions
   *
   * @return {Promise<object>}
   *
   * @method EventGateway#listFunctions
   */
  async listFunctions() {
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.ctrlPort}/v1/spaces/${this.props.space}/functions`

    return await this._get( endpoint )
  }

  /**
   * delete functions for event gateway
   *
   * @param {string} functionId
   * @return {Promise<object}>
   *
   * @method EventGateway#deleteFunction
   */
  async deleteFunction(functionId) {
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.ctrlPort}/v1/spaces/${this.props.space}/functions/${functionId}`

    return await this._delete( endpoint )
  }



  /**
   * create Event for event gateway
   *
   * @param {string} name - event name
   * @return {Promise<object}>
   *
   * @method EventGateway#createEvent
   */
  async createEvent(name) {
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.ctrlPort}/v1/spaces/${this.props.space}/eventtypes`

    const body = {
      name
    }

    return await this._post( endpoint, body )
  }

  /**
   * list events
   *
   * @return {Promise<object>}
   *
   * @method EventGateway#listEvents
   */
  async listEvents() {
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.ctrlPort}/v1/spaces/${this.props.space}/eventtypes`

    return await this._get( endpoint )
  }




  /**
   * delete Event for event gateway
   *
   * @param {string} name - name of event type
   *
   * @method EventGateway#deleteEvent
   */
  async deleteEvent(name) {
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.ctrlPort}/v1/spaces/${this.props.space}/eventtypes/${name}`

    return await this._delete( endpoint )
  }



  /**
   * subscribe
   *
   * @param {string} eventType
   * @param {string} functionId
   * @param {string} [path=/]
   *
   * @method EventGateway#subscribe
   */
  async subscribe( eventType, functionId, path ) {
    // todo - do validation for parameters
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.ctrlPort}/v1/spaces/${this.props.space}/subscriptions`
    const _path = path || '/'

    const body = {
      type: 'async',
      eventType,
      functionId,
      path: _path
    }

    return await this._post( endpoint, body )
  }

  /**
   * list subscriptions
   *
   * @return {Promise<object>}
   *
   * @method EventGateway#listSubscriptions
   */
  async listSubscriptions() {
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.ctrlPort}/v1/spaces/${this.props.space}/subscriptions`

    return await this._get( endpoint )
  }



  /**
   * unsubscribe
   *
   * @param {string} subscriptionId - ID of subscription
   *
   * @method EventGateway#unsubscribe
   */
  async unsubscribe( subscriptionId ) {
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.ctrlPort}/v1/spaces/${this.props.space}/subscriptions/${subscriptionId}`

    return await this._delete( endpoint )
  }


  /**
   * emit
   *
   * @param {string} eventType
   * @param {object} data
   * @param {string} [path=/]
   *
   * @method EventGateway#emit
   */
  async emit( eventType, data, path ) {
    // todo - do validation for parameters
    const _path = path || '/'
    const endpoint = `${this.props.protocol}://${this.props.host}:${this.props.port}${_path}`

    const body = {
      eventType,
      eventID: uuidv4(),
      cloudEventsVersion: this.props.cloudEventsVersion,
      source: this.props.source,
      eventTime: new Date().toISOString(),
      data,
      contentType: 'application/json'
    }

    return await this._post( endpoint, body )
  }


  /**
   * clean all subscriptions, events and functions
   *
   */
  async clean() {
    try {
      let list
      list = await this.listSubscriptions()

      for( let item of list.subscriptions ) {
        await this.unsubscribe( item.subscriptionId )
      }

      list = await this.listEvents()
      for( let item of list.eventTypes ) {
        await this.deleteEvent( item.name )
      }

      list = await this.listFunctions()
      for( let item of list.functions ) {
        await this.deleteFunction( item.functionId )
      }

      return
    } catch( err ) {
      throw err
    }
  }

  /**
   * post
   *
   * @param {string} url
   * @param {object} data
   * @return {Promise<object>}
   *
   * @private
   */
  async _post( url, data ) {
    const res = await fetch( url, {
      method: 'POST',
      headers: {
        "Content-Type": "application/cloudevents+json",
      },
      body: JSON.stringify(data),
    })

    if (res.status < 200 || res.status > 299) {
      const data = await res.text();
      throw new Error(`Error on posting event ${res.status} ${data}`);
    } else {
      return await res.text()
    }
  }

  /**
   * delete
   *
   * @param {string} url
   * @return {Promise<object>}
   *
   * @private
   */
  async _delete( url ) {
    const res = await fetch( url, {
      method: 'DELETE'
    })

    if (res.status < 200 || res.status > 299) {
      const data = await res.text();
      throw new Error(`Error on posting event ${res.status} ${data}`);
    } else {
      return await res.text()
    }
  }

  /**
   * get
   *
   * @param {string} url
   * @return {Promise<object>}
   *
   * @private
   */
  async _get( url ) {
    const res = await fetch( url, {
      method: 'GET'
    })

    if (res.status < 200 || res.status > 299) {
      const data = await res.text();
      throw new Error(`Error on posting event ${res.status} ${data}`);
    } else {
      return await res.json()
    }
  }
}

module.exports = EventGateway
