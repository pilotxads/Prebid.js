import * as utils from '../src/utils.js';
// import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';

// https://github.com/prebid/Prebid.js/blob/master/test/spec/modules/ozoneBidAdapter_spec.js
// https://github.com/prebid/Prebid.js/blob/master/test/spec/modules/spotxBidAdapter_spec.js
// http://prebid.org/prebid-video/video-overview.html

// http://localhost:9999/integrationExamples/gpt/px-instream.html?pbjs_debug=true&pbjs_testbids=true

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
    utils.logInfo('PilotX: isBidRequestValid :', bid);
    if (!bid) {
      return false;
    }
    if (bid.bidder !== BIDDER_CODE || !utils.deepAccess(bid, 'params') || !utils.deepAccess(bid, 'mediaTypes') || !utils.deepAccess(bid, 'adUnitCode') || !utils.deepAccess(bid, 'bidId')) {
      utils.logError('PilotX: Error 1 == ');
      return false;
    }
    if (typeof (utils.getBidIdParameter('params', bid)) !== 'object') {
      utils.logError(BIDDER_CODE + ': params not defined or invalid bid.');
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
        bidId: utils.getBidIdParameter('bidId', bid)
      });
    });
    utils.logInfo('== PILOTX 3== ', requests)
    return requests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    utils.logInfo('== PILOTX 8 serverResponse == ', serverResponse);
    utils.logInfo('== PILOTX 9 bidRequest == ', bidRequest);
    try {
      const response = utils.getBidIdParameter('bid', serverResponse.body.seatbid[0]);
      const requested = JSON.parse(utils.deepAccess(bidRequest, 'data'));
      utils.logInfo('=== PILOTX 10 ====', response);
      utils.logInfo('=== PILOTX 11 ====', requested);
      const bidResponses = [];

      utils._each(response, function (bidResponse) {
        if (!bidResponse.is_passback) {
          const width = utils.getBidIdParameter('width', requested);
          const height = utils.getBidIdParameter('height', requested);

          utils.logInfo('xbidResponse === ', bidResponse);
          const mediaType = utils.deepAccess(requested, 'mediaTypes.video') ? VIDEO : BANNER;
          const payload = {
            requestId: utils.getBidIdParameter('bidId', requested),
            cpm: utils.getBidIdParameter('price', bidResponse),
            width: width,
            height: height,
            creativeId: utils.getBidIdParameter('crid', bidResponse),
            currency: CURRENCY,
            netRevenue: false,
            ttl: TIME_TO_LIVE,
            mediaType: mediaType,
            meta: {
              mediaType,
              advertiserDomains: utils.getBidIdParameter('adomain', bidResponse)
            }
          }
          if (mediaType === VIDEO) {
            const vastUrl = replaceMacros(utils.getBidIdParameter('adm', bidResponse), width, height);
            payload.vastUrl = vastUrl
            if (utils.deepAccess(requested, 'mediaTypes.video.context') === 'outstream') {
              payload.adUrl = vastUrl;
              payload.ad = mediaType;
              const renderer = Renderer.install({
                id: utils.getBidIdParameter('bidId', requested),
                url: '//',
                loaded: false,
                config: {
                  adText: 'PilotX Prebid.js Outstream Video Ad',
                  width: width,
                  height: height,
                  options: {
                    slot: utils.getBidIdParameter('adUnitCode', requested)
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
            payload.ad = utils.getBidIdParameter('adm', bidResponse);
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
    data-tag=${vastUrl}&pageurl=${window.location.href}&domain=${window.location.hostname}
    &w=${w}&h=${h}'  data-id='pid-1241' data-width='640' data-height='360'></div>`
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
        if (!isScriptLoaded()) {
          window.document.getElementsByTagName('head')[0].appendChild(script);
        }
        window.document.getElementById(adSlot).innerHTML = adVideo;
      }
    } else {
      if (!isScriptLoaded()) {
        window.document.getElementsByTagName('head')[0].appendChild(script);
      }
      document.body.appendChild(adContanier);
    }
  } catch (err) {
    utils.logError('[PX][renderer] Error:' + err.message)
  }
  return true;
}

function isScriptLoaded() {
  try {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length; i--;) {
      if (scripts[i].src == PILOTX_PLAYER_URL) return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

function replaceMacros(vastUrl, width, height) {
  try {
    if (vastUrl.includes('{PAGEURL}')) {
      vastUrl = vastUrl.replace('{PAGEURL}', encodeURI(window.location.href) || 'unknown');
    }
    if (vastUrl.includes('{DOMAIN}')) {
      vastUrl = vastUrl.replace('{DOMAIN}', encodeURI(window.location.hostname) || 'unknown');
    }
    if (vastUrl.includes('{W}')) {
      vastUrl = vastUrl.replace('{W}', width);
    }
    if (vastUrl.includes('{H}')) {
      vastUrl = vastUrl.replace('{H}', height);
    }
    utils.logInfo('[PX]: vastOutput = ', vastUrl);
    return vastUrl;
  } catch (error) {
    utils.logError('[PX]: vastOutputError = ', vastUrl);
    return vastUrl;
  }
}
registerBidder(spec);
utils.logInfo('PILOTX: Loaded successfully!');
