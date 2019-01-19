const { InputStream, OutputStream } = require('./');

const host = 'localhost';
const port = 10000;
const token = 'test-token';

const delay = msec => {
  return new Promise((resolve, reject) => {
    setTimeout( resolve, msec )
  })
}



describe('connectivity between input and output', () => {
  let input, output;

  beforeEach( () => {
    input = new InputStream();
    output = new OutputStream();
  });

  afterEach( () => {
    input.stop();
    output.stop();

    input = null;
    output = null;
  });

  const testData = {
    type: 'test-data',
    meta: 'test-meta',
    payload: Buffer.alloc(4)
  }

  test('input can connect output interface, when input has initiated after output setupped', async (done) => {
    output.start( { port, token } );
    await delay(500);

    input
      .on('data', data => {
        expect( data ).toEqual(testData);
        done();
      })
      .start({ host, port, token });

    await delay(500);
    output.write( testData );
  });

  test('input can connect output interface, when input has initiated before output setupped', async (done) => {
    const retryCounter = jest.fn();

    input
      .on('data', data => {
        expect( data ).toEqual(testData);
        expect( retryCounter.mock.calls.length ).toBe(1);
        done();
      })
      .on('status', status => {
        if( status.code === 14 ) retryCounter();
      })
      .start({ host, port, token });

    await delay(50);
    output.start( { port, token } );

    await delay(1000);
    output.write( testData );
  });
});


describe('data transfer test between input and output', () => {
  let input, output;

  beforeEach( async () => {
    input = new InputStream();
    output = new OutputStream();

    input.start({ host, port, token });
    output.start( { port, token } );
    await delay(500);
  });

  afterEach( () => {
    input.stop();
    output.stop();

    input = null;
    output = null;
  });


  test('when type of each props are valid, input can receive all data', done => {
    const out = {
      type: 'test-data',
      meta: 'test-meta',
      payload: Buffer.alloc(4)
    };
    const expected = Object.assign({}, out);

    input.on('data', data => {
      expect( data ).toEqual(expected);
      done();
    });

    output.write(out);
  });

  test('when type prop is number, it will be toStringed', done => {
    const out = {
      type: 1234,
      meta: 'test-meta',
      payload: Buffer.alloc(4)
    };
    const expected = Object.assign({}, out, { type: "1234" });

    input.on('data', data => {
      expect( data ).toEqual(expected);
      done();
    });

    output.write(out);
  });

  test('when meta prop is number, it will be toStringed', done => {
    const out = {
      type: 'test-data',
      meta: 1234,
      payload: Buffer.alloc(4)
    };
    const expected = Object.assign({}, out, { meta: "1234" });

    input.on('data', data => {
      expect( data ).toEqual(expected);
      done();
    });

    output.write(out);
  });

  test('when payload prop is not Buffer object, it will be empty array', done => {
    const out = {
      type: 'test-data',
      meta: 'test-meta',
      payload: 1234
    };
    const expected = Object.assign({}, out, { payload: Buffer.alloc(0) });

    input.on('data', data => {
      expect( data ).toEqual(expected);
      done();
    });

    output.write(out);
  });

  test('when only type prop is streamed, meta and payload would be empty string and array', done => {
    const out = {
      type: 'test-data'
    };
    const expected = Object.assign({}, out, { meta: '', payload: Buffer.alloc(0) });

    input.on('data', data => {
      expect( data ).toEqual(expected);
      done();
    });

    output.write(out);
  });

  test('when only meta prop is streamed, type and payload would be empty string and array', done => {
    const out = {
      meta: 'test-meta'
    };
    const expected = Object.assign({}, out, { type: '', payload: Buffer.alloc(0) });

    input.on('data', data => {
      expect( data ).toEqual(expected);
      done();
    });

    output.write(out);
  });

  test('when only payload prop is streamed, type and meta would be empty string', done => {
    const out = {
      payload: Buffer.alloc(4)
    };
    const expected = Object.assign({}, out, { type: '', meta: '' });

    input.on('data', data => {
      expect( data ).toEqual(expected);
      done();
    });

    output.write(out);
  });
});
