const {
  is_h264_keyframe
} = require('./media-utils');

const {
  dummyrtp
} = require('./test-util.js');


describe('is_h264_keyframe', () => {
  it('will return true, when fragment equal 5', () => {
    const rtp = dummyrtp( {fragment: 5} );
    expect( is_h264_keyframe(rtp) ).toBe(true)
  })

  it('will return false, when fragment equal 6', () => {
    const rtp = dummyrtp( {fragment: 6} );
    expect( is_h264_keyframe(rtp) ).toBe(false)
  })

  it('will return true, when fragment equal 5, cc = 2, x = 1 and ext_len = 2', () => {
    const rtp = dummyrtp( {fragment: 5, cc: 2, x: 1, ext_len: 2} );
    expect( is_h264_keyframe(rtp) ).toBe(true)
  })

  it('will return false, when fragment equal 28 and nal equal 5, but start_bit equal 0', () => {
    const rtp = dummyrtp( {fragment: 28, nal: 5, start_bit: 0} );
    expect( is_h264_keyframe(rtp) ).toBe(false)
  })

  it('will return true, when fragment equal 28 and nal equal 5 and start_bit equal 1', () => {
    const rtp = dummyrtp( {fragment: 28, nal: 5, start_bit: 1} );
    expect( is_h264_keyframe(rtp) ).toBe(true)
  })

  it('will return true, when fragment equal 28 and nal equal 5 and start_bit equal 1 and cc = 3, x = 1 and ext_len = 4', () => {
    const rtp = dummyrtp( {fragment: 28, nal: 5, start_bit: 1, cc: 3, x: 1, ext_len: 4} );
    expect( is_h264_keyframe(rtp) ).toBe(true)
  })

  it('will return false, when fragment equal 29 and nal equal 5, but start_bit equal 0', () => {
    const rtp = dummyrtp( {fragment: 29, nal: 5, start_bit: 0} );
    expect( is_h264_keyframe(rtp) ).toBe(false)
  })

  it('will return true, when fragment equal 29 and nal equal 5 and start_bit equal 1', () => {
    const rtp = dummyrtp( {fragment: 29, nal: 5, start_bit: 1} );
    expect( is_h264_keyframe(rtp) ).toBe(true)
  })

  it('will return true, when fragment equal 29 and nal equal 5 and start_bit equal 1 and cc = 3, x = 1 and ext_len = 4', () => {
    const rtp = dummyrtp( {fragment: 29, nal: 5, start_bit: 1, cc: 3, x: 1, ext_len: 4} );
    expect( is_h264_keyframe(rtp) ).toBe(true)
  })

  it('will return false, when fragment equal 30 and nal equal 5 and start_bit equal 1', () => {
    const rtp = dummyrtp( {fragment: 30, nal: 5, start_bit: 1} );
    expect( is_h264_keyframe(rtp) ).toBe(false)
  })

  it('will return false, when fragment equal 30 and nal equal 5 and start_bit equal 1 and cc = 6, x = 0', () => {
    const rtp = dummyrtp( {fragment: 30, nal: 5, start_bit: 1, cc: 6, x: 0} );
    expect( is_h264_keyframe(rtp) ).toBe(false)
  })


});


/////////////////////////////////////////////////////
// below is just a sample snipet code to use `is_h264_keyframe`

if(false) {
  const express = require('express');
  const GstHelper = require('../srvs/libs/gst-helper');

  const IN_PORT = 5004;

  /////////////////////////////////////////////////////
  // Definitions of gst pipeline scripts
  //
  const testsrc2udpsink = [
    'videotestsrc is-live=true',
    'video/x-raw,width=640,height=480,framerate=30/1',
    'timeoverlay',
    'x264enc aud=false key-int-max=1 tune=zerolatency intra-refresh=true',
    'video/x-h264,profile=constrained-baseline,level=(string)3.1',
    'rtph264pay pt=96',
    'capssetter caps="application/x-rtp,profile-level-id=(string)42c01f"',
    `udpsink host=127.0.0.1 port=${IN_PORT}`
  ].join(" ! ");


  const udpsrc2appsink = [
    `udpsrc port=${IN_PORT}`,
    'appsink max-buffers=1 name=sink'
  ].join(" ! ");

  const appsrc2jpegenc = [
    'appsrc name=source',
    "application/x-rtp,media=(string)video,clock-rate=(int)90000,encoding-name=(string)H264",
    'queue',
    'rtph264depay',
    'avdec_h264',
    'videoconvert',
    'jpegenc',
    'appsink max-buffers=1 name=sink'
  ].join(" ! ");

  /////////////////////////////////////////////////////
  // start gstreamer
  //

  const gstTestSrc = new GstHelper()
  gstTestSrc.start( testsrc2udpsink )

  const gstAppSink = new GstHelper()
  gstAppSink.start( udpsrc2appsink )

  const gstJpegEnc = new GstHelper()
  let jpegdata = null
  gstJpegEnc.start( appsrc2jpegenc )
  gstJpegEnc.on('data', data => {
    jpegdata = data;
  });

  let kf_recved = false
  gstAppSink.on('data', data => {
    // when once kf_recved becomes true, we will skip is_h264_keyframe() calcuration
    if(kf_recved || is_h264_keyframe(data)) {
      kf_recved = true
    }

    // Once kf_recved becomes true, we will keep decoding h264 and creating JPEG frame data.
    if(kf_recved) {
      gstJpegEnc.push(data);
    }
  });

  const app = express();
  app.get('/', ( req, res ) => {
    res.type('jpeg').send(jpegdata);
  });

  app.listen(9000);
}
