# EasyHits4U Bot
[EasyHits4U.com](https://www.easyhits4u.com/) is a traffic exchange site. These userscripts provide automation for EasyHits4U (claiming, captcha-solving, etc.).

## Script features

### Surfbar bot / captcha solver (main script)
There's 2 types of captchas:
#### Image-based captchas
- splits the captcha into 5 fragments for processing
- uses [Tensorflow](https://github.com/tensorflow/tfjs) / [Tensorflow's MobileNet model](https://github.com/tensorflow/tfjs-models/tree/master/mobilenet) to caption image fragments
- compares captions and descends to less likely guesses if there are no matches
- automatically clicks the right area of the captcha
  - delayed by a randomized number to decrease chances of getting banned
- progress on all guesses is stored
  - if there are no matches, based on this, random guesses are applied
  - **could** be reused to cache results if necessary

#### Calculation captchas
- uses [Tesseract](https://github.com/naptha/tesseract.js) as OCR worker
- optimizes the capcha images using [Jimp](https://github.com/oliver-moran/jimp)
  - inverting colors, as most captchas
  - applies normalization
- tries to run OCR on every subsequent step (some images don't need to be inverted)
- applies a hacky conversion for written numbers ("one" instead of "1")
- clicks the result automatically
  - no randomization because the libraries delay it by random amounts already 
- if everything fails, random guessing mode can be enabled
  - else falls back to manually solving (human action required)


### Auto Bonus Claimer
- clicks the button after one second
- no need to pay special attention to the bonus counter anymore

## Installation
1. make sure to have [Tampermonkey/Greasemonkey/Violentmonkey](https://gist.github.com/gekkedev/492e1b541ea3dd2cd8fbcc358fd224af) installed
1. click [here](https://raw.githubusercontent.com/gekkedev/easyhits4ubot/main/easyhits4ubot_surfbarcaptchas.user.js) for the main script (surfbar) and [here](https://raw.githubusercontent.com/gekkedev/easyhits4ubot/main/easyhits4ubot_surfbonus.user.js) for the bonus claiming script
1. confirm your intention to install the Userscript

By default, the script will automatically update every 24 hours (at least in Tampermonkey). If an updated version ever requires additional permissions, you will be asked to confirm this before the updated version gets installed.


**Disclaimer:** Your account might get banned without further notice if you use automation. Use it at your own risk.
