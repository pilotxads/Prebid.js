import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
// http://localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html?pbjs_debug=true
// http://prebid.org/dev-docs/bidder-adaptor.html
// pbjs.getBidResponses(); check bidresponse in console
// https://git.online-solution.biz/osi/prebidjs/commit/10ec9a599f46502b14ef41bf09173c36c959d7d5
// http://localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html?pbjs_debug=true&pbjs_testbids=true
// http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true&pbjs_testbids=true
const BIDDER_CODE = 'pilotx';
const ENDPOINT_URL = 'http://sparta.bwaserver.com/hb';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['px'],
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: function(bid) {
    utils.logInfo('PilotX: isBidRequestValid : ', config.getConfig(), bid, ' == ', bid.sizes.length);
    if (bid.bidder !== BIDDER_CODE || !bid.hasOwnProperty('params')) {
      return false;
    }
    if (!bid.params.placementId) {
      return false;
    }
    if (!bid.sizes.length) {
      return false;
    }

    return true;
  },
  buildRequests: function(validBidRequests) {
    let payloadItems = {};
    utils.logInfo('== PILOTX 1== ', validBidRequests)
    utils.logInfo('== PILOTX 2== ', payloadItems);

    utils._each(validBidRequests, function(bid) {
      utils.logInfo('== PILOTX 3== ', bid)
      // bid.sizes = [[300, 250], [300, 600]];
      // bid.sizes = [[640, 480]];
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

  interpretResponse: function(serverResponse, bidRequest) {
    utils.logInfo('== PILOTX 8 serverResponse == ', serverResponse);
    utils.logInfo('== PILOTX 9 bidRequest == ', bidRequest);
    try {
      const response = serverResponse.body.seatbid[0].bid;
      const requested = JSON.parse(bidRequest.data)[1];
      utils.logInfo('=== PILOTX 10 ====', response);
      utils.logInfo('=== PILOTX 11 ====', requested);
      const bidResponses = [];

      utils._each(response, function(bidResponse) {
        if (!bidResponse.is_passback) {
          // if ('banner' in imp) {
          //   prBid.mediaType = BANNER;
          //   prBid.width = rtbBid.w;
          //   prBid.height = rtbBid.h;
          //   prBid.ad = formatAdMarkup(rtbBid);
          // } else if ('video' in imp) {
          //   prBid.mediaType = VIDEO;
          //   prBid.vastUrl = rtbBid.nurl;
          //   prBid.width = imp.video.w;
          //   prBid.height = imp.video.h;
          // }

          bidResponses.push({
            mediaType: VIDEO,
            requestId: requested[2],
            cpm: bidResponse.price,
            width: requested[0],
            height: requested[1],
            creativeId: bidResponse.crid,
            currency: CURRENCY,
            netRevenue: false,
            ttl: TIME_TO_LIVE,
            // ad: bidResponse.adm
            // ad: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
            vastUrl: `http://localhost:9999/integrationExamples/gpt/vast.xml`
          });
        }
      });
      utils.logInfo('=== PILOTX 12 ====', bidResponses)
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
