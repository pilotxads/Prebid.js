// gulp test --specs test/spec/modules/pilotxBidAdapter_spec.js
import {expect} from 'chai';
import {spec} from 'modules/pilotxBidAdapter.js';

describe('PilotX adapter', function () {
  function getValidVideoBidObject() {
    return {
      bidId: '201973b38ac46e',
      adUnitCode: 'video1',
      bidder: 'pilotx',
      mediaTypes: {
        video: {
          playerSize: [[640, 480]],
          context: 'instream'
        }
      },
      params: {
        placementId: 13232361
      },
      sizes: [[640, 480]],
      src: 'client',
      transactionId: '99a9bf5b-f05b-4794-9bdd-7466f5c0f64f',
    };
  };
  function getValidBannerBidObject() {
    return {
      bidId: '2f5e45e85201e9',
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      bidder: 'pilotx',
      mediaTypes: {
        banner: {
          sizes: [[300, 200]]
        }
      },
      params: {
        placementId: 13144370
      },
      sizes: [[300, 200]],
      src: 'client',
      transactionId: '99a9bf5b-f05b-4794-9bdd-7466f5c0f64f',
    };
  }

  describe('<VIDEO> isBidRequestValid', function() {
    let bid;
    beforeEach(function() {
      bid = getValidVideoBidObject();
    });
    it('should fail validation if the bid is undefined', function() {
      const output = spec.isBidRequestValid();
      expect(output).to.equal(false);
    });
    it('should fail validation if the bid is not an object', function() {
      const output = spec.isBidRequestValid('not an object');
      expect(output).to.equal(false);
    })
    it('should succeed validation with the correct parameters', function() {
      expect(spec.isBidRequestValid(getValidVideoBidObject())).to.equal(true);
    });
    it('should fail without a placement id', function() {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should pass with bid has no sizes', function() {
      delete bid.mediaTypes.sizes;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should fail when bid has no adUnitCode', function() {
      delete bid.adUnitCode;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should fail when bid has no bidId', function() {
      delete bid.bidId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should fail with no Video context', function() {
      delete bid.mediaTypes.video.context;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  })

  describe('<BANNER> isBidRequestValid', function() {
    let bid;
    beforeEach(function() {
      bid = getValidBannerBidObject();
    });
    it('should fail validation if the bid is undefined', function() {
      const output = spec.isBidRequestValid();
      expect(output).to.equal(false);
    });
    it('should fail validation if the bid is not an object', function() {
      const output = spec.isBidRequestValid('not an object');
      expect(output).to.equal(false);
    })
    it('should succeed validation with the correct parameters', function() {
      expect(spec.isBidRequestValid(getValidVideoBidObject())).to.equal(true);
    });
    it('should fail without a placement id', function() {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should fail when bid has no adUnitCode', function() {
      delete bid.adUnitCode;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should fail when bid has no bidId', function() {
      delete bid.bidId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    let bid, bannerBid, bidReqObj;
    beforeEach(function() {
      bid = getValidVideoBidObject();
      bannerBid = getValidBannerBidObject();
      bidReqObj = {refererInfo: {referer: 'prebid.js'}};
    });
    it('should build a simple video request', function() {
      const request = spec.buildRequests([bid], bidReqObj)[0];
      const data = JSON.parse(request.data);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('http://localhost:3003/px_prebid_endpoint');
      expect(request.bidId).to.equal('201973b38ac46e');
      expect(data.width).to.equal(640);
      expect(data.height).to.equal(480);
      expect(data.adUnitCode).to.equal('video1');
      expect(data.mediaTypes).to.deep.equal({
        'video': {'playerSize': [[640, 480]], 'context': 'instream'}
      });
    });

    it('should replace invalid width and height', function() {
      const request = spec.buildRequests([bannerBid], bidReqObj)[0];
      const data = JSON.parse(request.data);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('http://localhost:3003/px_prebid_endpoint');
      expect(request.bidId).to.equal('2f5e45e85201e9');
      expect(data.width).to.equal(300);
      expect(data.height).to.equal(200);
      expect(data.adUnitCode).to.equal('div-gpt-ad-1460505748561-0');
      expect(data.mediaTypes).to.deep.equal({
        'banner': {'sizes': [[300, 200]]}
      });
    });

    it('should replace invalid width and height', function() {
      bannerBid.sizes = [];
      const request = spec.buildRequests([bannerBid], bidReqObj)[0];
      const data = JSON.parse(request.data);
      expect(data.width).to.equal(640);
      expect(data.height).to.equal(480);
    });
  })
});
