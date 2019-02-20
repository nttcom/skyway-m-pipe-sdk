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

