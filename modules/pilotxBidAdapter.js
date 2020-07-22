import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
// http://localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html?pbjs_debug=true
// http://prebid.org/dev-docs/bidder-adaptor.html
// pbjs.getBidResponses(); check bidresponse in console
// https://git.online-solution.biz/osi/prebidjs/commit/10ec9a599f46502b14ef41bf09173c36c959d7d5
const BIDDER_CODE = 'pilotx';
const ENDPOINT_URL = 'http://sparta.bwaserver.com/hb';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['px'],
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: function(bid) {
    utils.logInfo('PilotX: isBidRequestValid : ', config.getConfig(), bid, !!(bid.params.hashes && utils.isArray(bid.params.hashes)));
    // return !!(bid.params.hashes && utils.isArray(bid.params.hashes));
    if (bid.bidder !== BIDDER_CODE || !bid.hasOwnProperty('params') || !bid.hasOwnProperty('sizes')) {
      return false;
    }
    // if (!bid.params.placementId || !bid.sizes.length) {
    //   return false;
    // }

    return true;
  },
  buildRequests: function(validBidRequests) {
    let payloadItems = {};
    utils.logInfo('== PILOTX 1== ', validBidRequests)
    utils.logInfo('== PILOTX 2== ', payloadItems);

    utils._each(validBidRequests, function(bid) {
      utils.logInfo('== PILOTX 3== ', bid)
      bid.sizes = [[300, 250], [300, 600]];
      utils.logInfo('== PILOTX 4== ', bid.sizes)
      payloadItems[1] = [bid.sizes[0][0], bid.sizes[0][1], bid.bidId]
    });
    utils.logInfo('== PILOTX 5== ', payloadItems);
    const payload = payloadItems;
    utils.logInfo('== PILOTX 6== ', payloadItems);
    const payloadString = JSON.stringify(payload);
    utils.logInfo('== PILOTX 7== ', payloadString);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },

  // buildRequests: function(validBidRequests) {
  //   let requests = [];
  //   utils.logInfo('PilotX: buildRequests : ', validBidRequests);
  //   utils._each(validBidRequests, function(bid) {
  //     requests.push({
  //       method: 'POST',
  //       url: ENDPOINT_URL,
  //       options: {
  //         contentType: 'application/json',
  //         withCredentials: true
  //       },
  //       data: JSON.stringify({
  //         transaction_id: bid.bidId,
  //         hashes: utils.getBidIdParameter('hashes', bid.params)
  //       }),
  //       bidId: bid.bidId
  //     });
  //   });

  //   return requests;
  // },

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
