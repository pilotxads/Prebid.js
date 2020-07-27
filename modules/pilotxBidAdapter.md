# Overview
```
Module Name: Adlive Bid Adapter
Module Type: Bidder Adapter
Maintainer: traffic@adlive.io
```

# Description
Module that connects to Adlive's server for bids.
Currently module supports only banner mediaType.

# Test Parameters
```
    var adUnits = [{
        code: '/test/div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [{
            bidder: 'adlive',
            params: {
                hashes: ['1e100887dd614b0909bf6c49ba7f69fdd1360437']
            }
        }]
    }];
```
# SAMPLE RESPONSE 
# {"id":"b97fae24-7c36-4fc8-9201-789d07e8b6aa","seatbid":[{"bid":[{"adm":"<img src=\"http://lh3.googleusercontent.com/npew9dDnrDUsZl3lrIzjGAUr2SGR6qC2XLteyiNSeAp2SumD-eE3cruubr5FunAWyq0=w300-h250\" width=\"300\" height=250\" />","adomain":["nordvpn.com"],"cat":["IAB19"],"cid":"1_117","crid":"1_88_1877","id":"b97fae24-7c36-4fc8-9201-789d07e8b6aa","impid":"1","iurl":"https://d2mluzprf1s92y.cloudfront.net/image?enc_d=MriMMCwn68bLlo6zXrPFg0ZpY4fC8eAA%2BYCDnUjtTtlPnf3EaPw9GaFXeVN6S76T","nurl":"http://sparta.bwaserver.com/2/WIN","price":11,"bid":"2c5e5aac7c4b26"}]}]}

# http://localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html?pbjs_debug=true&pbjs_testbids=true
# http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true&pbjs_testbids=true
# https://sonobi.atlassian.net/wiki/spaces/PP/pages/867106817/Prebid+Video+Ad+Manager+Integration+Guide