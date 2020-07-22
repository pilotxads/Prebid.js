import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
// http://localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html?pbjs_debug=true
// http://prebid.org/dev-docs/bidder-adaptor.html
// pbjs.getBidResponses(); check bidresponse in console
// https://git.online-solution.biz/osi/prebidjs/commit/10ec9a599f46502b14ef41bf09173c36c959d7d5
const BIDDER_CODE = 'pilotx';
const ENDPOINT_URL = 'https://sparta.bwaserver.com/hb';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['px'],
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: function(bid) {
    utils.logInfo('PilotX: isBidRequestValid : ', config.getConfig(), bid, !!(bid.params.hashes && utils.isArray(bid.params.hashes)));
    // return !!(bid.params.hashes && utils.isArray(bid.params.hashes));
    if (bid.bidder !== BIDDER_CODE || typeof bid.params === 'undefined') {
      return false;
    }
    if (typeof bid.params.placementId === 'undefined') {
      return false;
    }
    return true;
  },

  buildRequests: function(validBidRequests) {
    let requests = [];
    utils.logInfo('PilotX: buildRequests : ', validBidRequests);
    utils._each(validBidRequests, function(bid) {
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL,
        options: {
          contentType: 'application/json',
          withCredentials: true
        },
        data: JSON.stringify({
          transaction_id: bid.bidId,
          hashes: utils.getBidIdParameter('hashes', bid.params)
        }),
        bidId: bid.bidId
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    try {
      utils.logInfo('=== PILOTX ====')
      const response = serverResponse.body;
      const bidResponses = [];

      utils._each(response, function(bidResponse) {
        if (!bidResponse.is_passback) {
          bidResponses.push({
            requestId: bidRequest.bidId,
            cpm: bidResponse.price,
            width: bidResponse.size[0],
            height: bidResponse.size[1],
            creativeId: bidResponse.hash,
            currency: CURRENCY,
            netRevenue: false,
            ttl: TIME_TO_LIVE,
            ad: bidResponse.content
          });
        }
      });

      return bidResponses;
    } catch (err) {
      utils.logInfo('=== PILOTX ====')
      utils.logError(err);
      return [];
    }
  }
};
registerBidder(spec);
utils.logInfo('PILOTX: PILOTX == was loaded');
