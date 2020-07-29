import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
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
const BIDDER_CODE = 'pilotx';
const ENDPOINT_URL = 'http://localhost:3003/px_prebid_endpoint';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['px'],
  supportedMediaTypes: [
    VIDEO, BANNER
  ],

  isBidRequestValid: function (bid) {
    utils.logInfo('PilotX: isBidRequestValid : ', config.getConfig(), bid, ' == ', bid.sizes.length);
    if (bid.bidder !== BIDDER_CODE || !bid.hasOwnProperty('params') || !bid.hasOwnProperty('sizes')) {
      return false;
    }
    if (!bid.params.placementId || !bid.sizes.length) {
      return false;
    }
    return true;
  },

  buildRequests: function (validBidRequests) {
    const requests = [];
    const payloadItems = {};
    utils.logInfo('== PILOTX validBidRequests == ', validBidRequests)
    utils._each(validBidRequests, function (bid) {
      payloadItems[1] = [
        bid.sizes[0][0], bid.sizes[0][1], bid.bidId, Object.keys(bid.mediaTypes)[0]
      ]
      const payload = JSON.stringify(payloadItems)
      utils.logInfo('== PILOTX 7== ', payload);
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL,
        options: {
          contentType: 'text/plain',
        },
        data: JSON.stringify(payloadItems),
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
      const requested = JSON.parse(bidRequest.data)[1];
      utils.logInfo('=== PILOTX 10 ====', response);
      utils.logInfo('=== PILOTX 11 ====', requested);
      const bidResponses = [];

      utils._each(response, function (bidResponse) {
        if (!bidResponse.is_passback) {
          utils.logInfo('xbidResponse === ', bidResponse);
          const payload = {
            requestId: requested[2],
            cpm: bidResponse.price,
            width: requested[0],
            height: requested[1],
            creativeId: bidResponse.crid,
            currency: CURRENCY,
            netRevenue: false,
            ttl: TIME_TO_LIVE
          }
          if (bidResponse.media_type === VIDEO) {
            payload.mediaType = VIDEO;
            payload.vastUrl = bidResponse.adm
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
registerBidder(spec);
utils.logInfo('PILOTX: Loaded successfully!');
