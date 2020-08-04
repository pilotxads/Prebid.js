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
        obj.outstream_options = utils.deepAccess(bid, 'params.outstream_options')
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
                  options: utils.deepAccess(requested, 'outstream_options'),
                }
              });

              try {
                utils.logInfo('=== calling outstreamRender ====')
                renderer.setRender(outstreamRender);
                renderer.setEventHandlers({
                  impression: function impression() {
                    return utils.logInfo('PilotX outstream event:impression event');
                  },
                  loaded: function loaded() {
                    return utils.logMessage('PilotX outstream event:loaded event');
                  },
                  ended: function ended() {
                    utils.logInfo('PilotX outstream event: ended');
                  }
                });
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
  // renderer.config.options
  try {
    // Script not loaded
    const w = utils.getBidIdParameter('width', bid.renderer.config.options);
    const h = utils.getBidIdParameter('height', bid.renderer.config.options);
    // const vastUrl = utils.getBidIdParameter('vastUrl', bid.renderer.config.options);
    const adSlot = utils.getBidIdParameter('slot', bid.renderer.config.options);
    utils.logInfo('outstreamRender was called: ', bid);
    if (!isMyScriptLoaded()) {
      const script = document.createElement('script');
      // script.src = `${PILOTX_PLAYER_URL}?w=${w}&h=${h}&pid=${vastUrl}page_url=${window.location.href}`;
      script.src = PILOTX_PLAYER_URL
      script.type = 'text/javascript';
      script.async = false; // <-- this is important
      const node = window.document.getElementById(adSlot);
      if (node.nodeName == 'IFRAME' || node.ownerDocument !== document) {
        let doc = null;
        const iframe = document.getElementById(adSlot);
        if (iframe.contentDocument) {
          doc = iframe.contentDocument;
        } else {
          doc = iframe.contentWindow.document;
        }
        doc.body.appendChild(script);
      } else {
        window.document.getElementsByTagName('head')[0].appendChild(script);
      }
    }
    if (adSlot && window.document.getElementById(adSlot)) {
      const div = `<div class='pilot-video standard' data-view='desktop' 
    data-tag='https://adn.pilotx.tv/vast?pid=1019&pageurl=${window.location.href}&domain=${window.location.hostname}&w=${w}&h=${h}' 
    data-id='pid-1241' data-width='640' data-height='360'></div>`
      window.document.getElementById(adSlot).innerHTML = div;
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
