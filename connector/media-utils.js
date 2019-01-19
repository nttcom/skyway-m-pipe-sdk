/**
 * detect H.246 keyframe
 * This function is inspired by Janus Gateway
 * ref. https://github.com/meetecho/janus-gateway/blob/master/utils.c#L643
 *
 * @param {Buffer} buffer - h264 rtp data
 * @return {boolean} - if frame is keyframe, this will return true. Otherwise, return false
 * @example
 * is_h264_keyframe( rtpData ) #=> true
 *
 */
function is_h264_keyframe( buffer ) {
  if( buffer instanceof Buffer && buffer.length > 0 ) {
    let hlen = 12
    const header = _rtp_header_parser(buffer);
    hlen += header.csrccount * 4;

    if( header.extension ) {
      const ext_len = buffer.readInt16BE(hlen + 2)
      hlen += ( 4 + ( ext_len ) * 4 );
    }
    const fragment = buffer[hlen] & 0x1F
      , nal = buffer[hlen + 1] & 0x1F
      , start_bit = buffer[hlen + 1] & 0x80;

    if(fragment == 5 || ((fragment == 28 || fragment == 29) && nal == 5 && start_bit == 128)) {
      return true;
    } else {
      return false;
    }
  } else {
    return false
  }
}

/**
 * @param {Buffer} buffer
 * @return {object}
 * @private
 */
function _rtp_header_parser( buffer ) {
  const version = ( buffer[0] & 0xC0 ) >> 6
    , padding   = ( buffer[0] & 0x20 ) >> 5
    , extension = ( buffer[0] & 0x10 ) >> 4
    , csrccount = ( buffer[0] & 0x0F )
    , markerbit = ( buffer[1] & 0x80 ) >> 7
    , type      = ( buffer[1] & 0x7F )
  const ret = {
    version, padding, extension, csrccount, markerbit, type
  }

  return ret
}

module.exports = {
  is_h264_keyframe
}
