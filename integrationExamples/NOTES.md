=================== PREBID TONY TODO ============
1. OFFSET IS ONLY ADDED LIKE THIS AT THE MOMENT: <Linear skipoffset="00:00:05"> that got added.
    ADD TRACKING EVENT OFFSET TO - Tracking event="progress" eg. <Tracking event="progress" offset="00:00:05">
2. RESPONSE MUST INCLUDE media_Types:  The media type that was passed, used to extract the media type and contentstream (instream or outstream) for video.
3a. Video Response require "vastUrl" in the response.
3. VIDE0 RETURN VAST URL
4. Must be able to account for no sizes in some VIDEOs
(Prebid ERROR: Invalid bid from pilotx. Ignoring bid: Video bid does not have required vastUrl or renderer property)
5. BANNER RETURNS IMG TAGS eg. "<img src=\"http://lh3.googleusercontent.com/npew9dDnrDUsZl3lrIzjGAUr2SGR6qC2XLteyiNSeAp2SumD-eE3cruubr5FunAWyq0=w300-h250\" width=\"300\" height=250\" />"
6. Compressed responses: All bid responses from the bidder’s server must be gzipped.
7. Additionally each response is required to return an IAB subcategory
ethod: "POST", url: "http://localhost:3003/px_prebid_endpoint", data: "{"1":[640,480,"2d0f2c20222a05",{"video":{"context":"outstream","playerSize":[[640,480]]}}]}", bidId: "2d0f2c20222a05"}
==================================================================