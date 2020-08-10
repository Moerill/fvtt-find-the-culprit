# Find the culprit

<img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/moerill/fvtt-find-the-culprit?style=for-the-badge"> <img alt="GitHub" src="https://img.shields.io/github/license/moerill/fvtt-find-the-culprit?style=for-the-badge"> <img alt="GitHub Releases" src="https://img.shields.io/github/downloads/moerill/fvtt-find-the-culprit/latest/total?style=for-the-badge">  [![PayPal](https://img.shields.io/badge/Donate-PayPal-blue?style=for-the-badge)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FYZ294SP2JBGS&source=url)

This module helps you debug compatibility issues of modules, by finding the module that is responsible for the issue, without having to manually activate and deactivate all your modules yourself. Just click the **Find the culprit** button in **Module Management** to start the process.  
* You will be asked to select a module to keep active at all times. Choose the module that you want to debug.  
* Your page will refresh, deactivating all modules, except the chosen one and this.
* Check whether your issue still persists.
* If the issue persists, the module will start a binary search by only reactivating half of your previous modules, refreshing the page, going on like this until the culprit is found. 
  * Just follow the prompts appearing after each refresh.
  * Depending on the amount of modules you have installed this process could take a while, but at most ``log(n) + 2`` iterations, where *n* is the amount of modules you had activated.
* If you accidently close one of the prompts, just refresh the page manually and it will reappear.

## Licensing
This module currently is not licensed itself.

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development](https://foundryvtt.com/article/license/).

## Support the development
Want to help me develop? Send a merge request on this gitlab or contact me on Discord (Moerill#7205).  
Want to support me in another way? 
Leave me some nice comments (e.g. on Discord), recommend this module to others and/or leave a donation over at my [PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FYZ294SP2JBGS&source=url).