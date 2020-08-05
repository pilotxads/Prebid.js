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
// http://prebid.org/examples/video/outstream/pb-ve-outstream-no-server.html
const BIDDER_CODE = 'pilotx';
const ENDPOINT_URL = 'http://localhost:3003/px_prebid_endpoint';
const PILOTX_PLAYER_URL = 'https://player.pilotx.tv/v2/player.min.js';
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
    if (bid.bidder !== BIDDER_CODE || !utils.deepAccess(bid, 'params') || !utils.deepAccess(bid, 'mediaTypes') || !utils.deepAccess(bid, 'adUnitCode')) {
      utils.logError('PilotX: Error 1 == ');
      return false;
    }
    if (!utils.deepAccess(bid, 'params.placementId')) {
      utils.logError('PilotX: Error 2 == ');
      return false;
    }
    if (!utils.deepAccess(bid, 'mediaTypes.video') && !utils.deepAccess(bid, 'mediaTypes.banner')) {
      utils.logError('PilotX: Invalid Media Type == ');
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
    }
    return true;
  },

  buildRequests: function (validBidRequests) {
    const requests = [];
    utils.logInfo('== PILOTX validBidRequests == ', validBidRequests)
    utils._each(validBidRequests, function (bid) {
      const sizes = utils.getBidIdParameter('sizes', bid);
      utils.logInfo('== PX SIZES ==', sizes);
      const obj = {
        width: utils.isArray(sizes) && sizes.length ? sizes[0][0] : 640,
        height: utils.isArray(sizes) && sizes.length ? sizes[0][1] : 480,
        bidId: utils.getBidIdParameter('bidId', bid),
        mediaTypes: utils.getBidIdParameter('mediaTypes', bid),
        adUnitCode: utils.getBidIdParameter('adUnitCode', bid)
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
            if (utils.deepAccess(requested, 'mediaTypes.video.context') === 'outstream') {
              payload.adUrl = bidResponse.vastUrl;
              payload.ad = mediaType;
              const renderer = Renderer.install({
                id: requested.bidId,
                url: '//',
                loaded: false,
                config: {
                  adText: 'PilotX Prebid.js Outstream Video Ad',
                  width: requested.width,
                  height: requested.height,
                  options: {
                    slot: requested.adUnitCode
                  },
                }
              });

              try {
                utils.logInfo('=== calling outstreamRender ====')
                renderer.setRender(outstreamRender);
              } catch (err) {
                utils.logError('Prebid Error:', err);
              }
              payload.renderer = renderer;
            }
          } else {
            payload.mediaType = BANNER;
            payload.ad = bidResponse.adm;
          }
          utils.logMessage('[PX]: ', payload);
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

// config would specific the player type
// if no player or adslot return slider Player

function outstreamRender(bid) {
  try {
    const w = utils.getBidIdParameter('width', bid.renderer.config.options);
    const h = utils.getBidIdParameter('height', bid.renderer.config.options);
    const adSlot = utils.getBidIdParameter('slot', bid.renderer.config.options);
    utils.logInfo('outstreamRender was called: ', bid);
    const script = document.createElement('script');
    script.src = PILOTX_PLAYER_URL
    script.type = 'text/javascript';
    script.async = false; // important

    const node = window.document.getElementById(adSlot);
    let vastUrl = utils.deepAccess(bid, 'vastUrl')
    const adVideo = `<div class='pilot-video ${adSlot && node ? `in_article` : `slider`}' data-view='desktop' 
    data-tag='${vastUrl}&pageurl=${window.location.href}&domain=${window.location.hostname}&w=${w}&h=${h}' 
    data-id='pid-1241' data-width='640' data-height='360'></div>`
    const adContanier = document.createElement('div');
    adContanier.innerHTML = adVideo;

    if (adSlot && node) {
      if (node.nodeName == 'IFRAME') {
        let framedoc = node.contentDocument;
        if (!framedoc && node.contentWindow) {
          framedoc = node.contentWindow.document;
        }
        // node.body.appendChild(adContanier);
        utils.logInfo('=== PILOTX 1209 ====', framedoc)
        framedoc.getElementsByTagName('head')[0].appendChild(script);
        framedoc.body.appendChild(adContanier);
      } else {
        if (!isMyScriptLoaded()) {
          window.document.getElementsByTagName('head')[0].appendChild(script);
        }
        window.document.getElementById(adSlot).innerHTML = adVideo;
      }
    } else {
      if (!isMyScriptLoaded()) {
        window.document.getElementsByTagName('head')[0].appendChild(script);
      }
      document.body.appendChild(adContanier);
    }
  } catch (err) {
    utils.logError('[PX][renderer] Error:' + err.message)
  }
}

function isMyScriptLoaded() {
  try {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length; i--;) {
      if (scripts[i].src == PILOTX_PLAYER_URL) return true;
    }
  } catch (error) {
    return false;
  }

  return false;
}

registerBidder(spec);
utils.logInfo('PILOTX: Loaded successfully!');
