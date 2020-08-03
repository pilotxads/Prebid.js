import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
// http://localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html?pbjs_deb
// ug=true http://prebid.org/dev-docs/bidder-adaptor.html
// pbjs.getBidResponses(); check bidresponse in console
// https://git.online-solution.biz/osi/prebidjs/commit/10ec9a599f46502b14ef41bf0
// 9 173c36c959d7d5
// http://localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html?pbjs_deb
// u g=true&pbjs_testbids=true
// http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=tru
// e &pbjs_testbids=true
// http://localhost:9999/integrationExamples/gpt/multi.html?pbjs_debug=true&pbjs
// _ testbids=true
// http://localhost:9999/integrationExamples/gpt/outstream.html?pbjs_debug=true&pbjs_testbids=true
// http://prebid.org/prebid-video/video-overview.html
// https://developer.spotxchange.com/content/local/docs/HeaderBidding/PrebidAdapter.md
const BIDDER_CODE = 'pilotx';
const ENDPOINT_URL = 'http://localhost:3003/px_prebid_endpoint';
const PILOTX_RENDERER_URL = 'http://localhost:3003/pilotx-renderer.js';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['px'],
  supportedMediaTypes: [
    VIDEO, BANNER
  ],

  isBidRequestValid: function (bid) {
    utils.logInfo('PilotX: isBidRequestValid : ', config.getConfig(), bid, ' == ', bid.sizes.length, 'bid.mediaTypes.video == ', utils.deepAccess(bid, 'mediaTypes'));
    if (bid.bidder !== BIDDER_CODE || !utils.deepAccess(bid, 'params') || !utils.deepAccess(bid, 'sizes') || !utils.deepAccess(bid, 'mediaTypes')) {
      utils.logError('PilotX: Error 1 == ');
      return false;
    }
    if (!utils.deepAccess(bid, 'params.placementId') || !bid.sizes.length || !utils.isArray(bid.sizes)) {
      utils.logError('PilotX: Error 2 == ');
      return false;
    }
    if (utils.deepAccess(bid, 'mediaTypes.video')) {
      utils.logInfo('PilotX: VIDEO == ');
      if (!utils.deepAccess(bid, 'mediaTypes.video.context')) {
        utils.logError('PilotX: == Video Context Not Found == ');
        return false;
      }
      if (utils.deepAccess(bid, 'mediaTypes.video.context') !== 'instream' && utils.deepAccess(bid, 'mediaTypes.video.context') !== 'outstream') {
        utils.logError('PilotX: == Invalid Video Context == ');
        return false;
      }
      if (utils.deepAccess(bid, 'mediaTypes.video.context') === 'outstream' && !utils.deepAccess(bid, 'params.outstream_options.slot')) {
        utils.logError('PilotX: == Invalid OutStream Slot == ');
        return false;
      }
    }
    return true;
  },

  buildRequests: function (validBidRequests) {
    const requests = [];
    utils.logInfo('== PILOTX validBidRequests == ', validBidRequests)
    utils._each(validBidRequests, function (bid) {
      const obj = {
        width: bid.sizes[0][0],
        height: bid.sizes[0][1],
        bidId: bid.bidId,
        mediaTypes: bid.mediaTypes
      }
      if (utils.deepAccess(bid, 'mediaTypes.video.context') === 'outstream') {
        obj.outstream_option = utils.deepAccess(bid, 'params.outstream_options')
      }
      const payload = JSON.stringify(obj)
      utils.logInfo('== PILOTX 7== ', payload);
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload,
        bidId: bid.bidId
      });
    });
    utils.logInfo('== PILOTX 3== ', requests)
    return requests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    utils.logInfo('== PILOTX 8 serverResponse == ', serverResponse);
    utils.logInfo('== PILOTX 9 bidRequest == ', bidRequest);
    try {
      const response = serverResponse.body.seatbid[0].bid;
      const requested = JSON.parse(bidRequest.data);
      utils.logInfo('=== PILOTX 10 ====', response);
      utils.logInfo('=== PILOTX 11 ====', requested);
      const bidResponses = [];

      utils._each(response, function (bidResponse) {
        if (!bidResponse.is_passback) {
          utils.logInfo('xbidResponse === ', bidResponse);
          let mediaType = Object.keys(requested.mediaTypes)[0]
          const payload = {
            requestId: requested.bidId,
            cpm: bidResponse.price,
            width: requested.width,
            height: requested.height,
            creativeId: bidResponse.crid,
            currency: CURRENCY,
            netRevenue: false,
            ttl: TIME_TO_LIVE,
            meta: {
              mediaType,
              advertiserDomains: bidResponse.adomain
            }
          }
          if (mediaType === VIDEO) {
            payload.mediaType = VIDEO;
            payload.vastUrl = bidResponse.vastUrl;
            if (requested.mediaTypes.video.context === 'outstream') {
              let config = {
                playerId: bidResponse.bid,
                width: requested.width,
                height: requested.height,
                vastUrl: bidResponse.vastUrl,
              }
              utils.logInfo(`PilotX: Attaching a renderer to OUTSTREAM video`);
              payload.renderer = newRenderer(bidResponse.bid, config);
              // requested.outstream_option
            }
          } else {
            payload.mediaType = BANNER;
            payload.ad = bidResponse.adm;
          }
          bidResponses.push(payload);
        }
      });
      utils.logInfo('=== PILOTX 12 ====', bidResponses)
      return bidResponses;
    } catch (err) {
      utils.logError(err);
      return [];
    }
  }
};

/* Rendering video ads - create a renderer instance, mark it as not loaded, set a renderer function.
The renderer function will not assume that the renderer script is loaded - it will push() the ultimate render function call
*/
function newRenderer(adUnitCode, rendererOptions = {}) {
  utils.logInfo(adUnitCode, ' == NEW RENDERER == ', rendererOptions);
  const renderer = Renderer.install({
    url: PILOTX_RENDERER_URL,
    id: adUnitCode,
    config: rendererOptions,
    loaded: true,
    adUnitCode
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logInfo('PILOTX Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function outstreamRender(bid) {
  utils.logInfo('PILOTX: outstreamRender called. Going to push the call to window.pilotxVideo.outstreamRender(bid) bid =', bid);
  // push to render queue because pilotxVideo may not be loaded yet
  bid.renderer.push(() => {
    window.pilotxVideo.outstreamRender(bid);
  });
}

registerBidder(spec);
utils.logInfo('PILOTX: Loaded successfully!');
