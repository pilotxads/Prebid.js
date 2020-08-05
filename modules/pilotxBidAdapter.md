# Overview
```
Module Name: PilotX Bid Adapter
Module Type: Bidder Adapter
Maintainer: desmond@pilotx.tv
```

# Description
Module that connects to PilotX's demand source(s).
PilotX module currently supports video and banner mediaType.

# Banner Test Parameters 
```
    const adUnits = [{
    code: 'div-gpt-ad-1460505748561-0',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]],
        }
    },
    bids: [{
        bidder: 'pilotx',
        params: {
            placementId: 13144370
        }
    }]

}];
```
# Video Test Parameters 
PilotX Project bid adapter only supports Instream and Outstream Video.
```
//Instream Video adUnit

    var videoAdUnit = [{
    code: 'video1',
    mediaTypes: {
        video: {
            playerSize: [640, 480],
            context: 'instream'
        }
    },
    bids: [{
        bidder: 'pilotx',
        params: {
            placementId: 13232361,
            video: {
                skippable: true,
                playback_method: ['auto_play_sound_off']
            }
        }
    }]
}];


//Outstream Video adUnit

    var videoAdUnit = [{
        code: 'video1',
        mediaTypes: {
            video: {
                playerSize: [640, 480],
                context: 'outstream'
            }
        },
        bids: [{
            bidder: 'pilotx',
            params: {
                placementId: 13232361,
                video: {
                    skippable: true,
                    playback_method: ['auto_play_sound_off']
                }
            }
        }]
    }];
```