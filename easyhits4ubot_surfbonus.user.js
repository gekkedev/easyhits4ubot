// ==UserScript==
// @name         EasyHits4U Auto Bonus Claimer
// @namespace    https://github.com/gekkedev/easyhits4ubot
// @version      0.1
// @description  Automatically claims the surfbar bonus
// @author       gekkedev
// @match        https://www.easyhits4u.com/prize.cgi
// @grant        none
// @updateURL    https://raw.githubusercontent.com/gekkedev/easyhits4ubot/main/easyhits4ubot_surfbonus.user.js
// @downloadURL  https://raw.githubusercontent.com/gekkedev/easyhits4ubot/main/easyhits4ubot_surfbonus.user.js

// ==/UserScript==

(function() {
    setTimeout(() => {
        let button = document.querySelector("form[action='/prize.cgi'] > button.big.ok")
        if (button) button.click()
    }, 1000)
})();
