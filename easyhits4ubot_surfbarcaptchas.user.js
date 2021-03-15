// ==UserScript==
// @name         EasyHits4U.com Surfbar bot (captcha solver)
// @namespace    https://github.com/gekkedev/easyhits4ubot
// @version      0.1
// @description  Automatically solves surfbar captchas
// @author       gekkedev
// @match        http*://*.easyhits4u.com/surf/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.0.0/dist/tf.min.js
// @require      https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@1.0.0
// @updateURL    https://raw.githubusercontent.com/gekkedev/easyhits4ubot/main/easyhits4ubot_surfbarcaptchas.user.js
// @downloadURL  https://raw.githubusercontent.com/gekkedev/easyhits4ubot/main/easyhits4ubot_surfbarcaptchas.user.js

// ==/UserScript==

(function() {
    'use strict';

    const saveDatabase = (db) => localStorage["easyhitsforyou_db"] = JSON.stringify(db)

    let injectedScripts = []
    function loadScript(url, callback) {
        if (!injectedScripts.includes(url)) { //prevent duplicate injections
            injectedScripts.push(url);
            let script = document.createElement('script');
            script.onload = callback;
            script.src = url;
            document.head.appendChild(script)
        } else callback()
    }

    //initialize local image DB if not existing
    if (localStorage["easyhitsforyou_db"] == undefined)
        saveDatabase([])

    let database = JSON.parse(localStorage["easyhitsforyou_db"])
    console.log("loaded " + database.length + " database entries")

    let currentlyLockedCaptcha = ""

    setInterval(() => {
        let captcha = document.querySelector('img#surf_image');
        if (
            !document.querySelector(".wait_for_timer") //not loading?
            && captcha //captcha image is found
            && currentlyLockedCaptcha != captcha.src //captcha is not being analyzed ATM
        ) {
            currentlyLockedCaptcha = captcha.src //lock this to prevent duplicate processes
            if(!captcha.classList.contains("surf-captcha-math")) { //is it an image riddle and not a match captcha?
                let canvases = [];
                console.log("Captcha URL:", captcha.src);

                //get imagemap areas
                let areas = Object.values(document.querySelectorAll(".captcha-container area"))

                //caching (needs work as it might cause bugs after a while)
                let previousAttempts = database.filter(attempt => attempt.riddle == captcha.src);
                if (previousAttempts.length) {
                    console.log("Previous attempts found!!!!!!! either the task was solved incorrectly, or the site is rotating tasks (currently we assume they don't rotate them");
                    //solutionIndex: j, works: true});
                    for (let i = 0; i < areas.length; i++) {
                        let failedAttempt = previousAttempts.find(attempt => attempt.solutionIndex == i)
                        if (!failedAttempt) { //if there is no failed attempt, that means we should make this attempt!!!!
                            previousAttempts.forEach(attempt => {
                                attempt.works = false
                            });
                            database.push({riddle: captcha.src, solutionIndex: i, works: true});
                            saveDatabase(database);
                            console.info(previousAttempts.length + " failed Attempts. Trying solution: " + i);
                            currentlyLockedCaptcha = ""; //unlock captchas
                            areas[i].click();
                            return
                        }
                    }
                }
                //what if, instead, we scrap the DB crap and instead take the randomized click callback + create a new callback that checks if anything has changed... ?
                //idea -> run this selector a few seconds later: $(".surf-box .warning-box")[0].style.display (normally it would be == "invisible")
                //+probably no need to unlock captcha. let the edge case logic take care of it until the equalization lock resolves itself ;-)

                //create a temporary image to crop out the clickable areas
                let image = new Image();
                image.src = captcha.src;
                const width = captcha.width;
                const height = captcha.height;
                image.width = width;
                image.height = height;
                image.onload = function() {
                    //set up a container - else canvases seem to autoscale
                    let canvasContainer = document.createElement("div")
                    //document.getElementById("surf_bar_layout").prepend(canvasContainer) //enable for visual debugging

                    //start cropping it all into separate canvases
                    for (let i = 0; i < areas.length; i++) {
                        let area = areas[i]
                        let coords = area.coords.split(",")

                        const canvas = document.createElement("canvas")
                        canvases.push(canvas)
                        //resize canvas, hopefully without scaling
                        canvas.width = parseInt(coords[2]) - parseInt(coords[0]);
                        canvas.height = coords[3];
                        const ctx = canvas.getContext('2d');

                        //apply each set of coords
                        ctx.drawImage(this, coords[0], 0, parseInt(coords[2]) - parseInt(coords[0]), coords[3], 0, 0, parseInt(coords[2]) - parseInt(coords[0]), coords[3]);
                    }

                    mobilenet.load().then(model => {
                        let results = []; //array or objects
                        let uniqueGuesses = []; //array of strings
                        const layerDepth = 3 //how many time sto guess per images, each time it becomes less accurate

                        //async block, let's create the promises but await completion in a non-blocking way
                        let promises = []
                        canvases.forEach(canvas => {
                            canvasContainer.appendChild(canvas)
                            promises.push(model.classify(canvas, layerDepth).then(predictions => {
                                //predictions.forEach(prediction => console.log('Prediction: ', prediction.className))
                                results.push(predictions)
                            }))
                        })

                        //wait for tensorflow / mobilenet completion & compare results
                        Promise.all(promises).then(() => {
                            let solved = false;
                            //iterate all collected guesses
                            depthLoop: for (let depth = 0; depth < layerDepth; depth++) { //but layer by layer
                                console.log("entering AI depth", depth);
                                for (let j = 0; j < results.length; j++) { //and guess by guess of each layer
                                    let guess = results[j][depth].className
                                    console.log("trying guess:", guess)
                                    if (uniqueGuesses.find(attempt => attempt.guess == guess && attempt.index != j)) {
                                        console.warn("Matched element no. " + (j + 1) + " as word " + guess)

                                        solved = true; //ensures the script knows this guessing round is done for; the result is final

                                        //if (confirm("autoclick?"))
                                        //instant clicking? rather not; randomization is safter.
                                        setTimeout(() => {
                                            database.push({riddle: captcha.src, solutionIndex: j, works: true});
                                            saveDatabase(database);
                                            currentlyLockedCaptcha = ""; //unlock captchas, so that we can retry another option for a currently failed captcha.
                                            areas[j].click()
                                        } , Math.ceil(Math.random() * 6000));
                                        break depthLoop
                                    } else uniqueGuesses.push({guess, index: j})
                                }
                            }
                            if (!solved) alert("NO RESULTS - pls choose a solution manually")
                        })
                    });

                    //display the image fragments (debugging)
                    //document.getElementById("surf_bar_layout").prepend(image)
                }
            } else { //if (captcha && captcha.classList.contains("surf-captcha-math")) {
                //get all cleartext answers
                let answers = Object.values(document.querySelectorAll(".captcha-container > .answer > a"));
                console.log("answers:", answers);
                //indicates throughout all loops if further solving attempts are required
                let solved = false;

                const attemptSolving = (result) => {
                    if (!solved) {
                        //https://stackoverflow.com/a/59149292/11498738
                        //https://stackoverflow.com/questions/53109734/remove-noise-from-image-text-nodejs

                        //not the best applicable solution but fast to implement
                        //a much better way would be the optimize the image even further or try using Tensorflow directly instead of Tesseract
                        let calcResult = result.replaceAll("‘", "-")
                        calcResult = calcResult.replaceAll("'", "-")
                        calcResult = calcResult.replaceAll(">", "")
                        calcResult = calcResult.replaceAll(",", "")
                        calcResult = calcResult.replaceAll(".", "")
                        calcResult = calcResult.replaceAll("_", "")
                        //written numbers
                        calcResult = calcResult.replaceAll("one", "1")
                        calcResult = calcResult.replaceAll("two", "2")
                        calcResult = calcResult.replaceAll("thxee", "3")
                        calcResult = calcResult.replaceAll("three", "3")
                        calcResult = calcResult.replaceAll("five", "5")
                        calcResult = calcResult.replaceAll("ten", "10")
                        calcResult = calcResult.replaceAll("eleven", "11")
                        calcResult = calcResult.replaceAll("twelve", "12")
                        calcResult = calcResult.replaceAll("thirteen", "13")
                        calcResult = calcResult.replaceAll("fourteen", "14")
                        calcResult = calcResult.replaceAll("four", "4") //order matters!
                        calcResult = calcResult.replaceAll("fout", "4")
                        calcResult = calcResult.replaceAll("ﬁﬂéeh", "15")
                        calcResult = calcResult.replaceAll("fifteen", "15")
                        calcResult = calcResult.replaceAll("sixteen", "16")
                        calcResult = calcResult.replaceAll("six", "6")
                        calcResult = calcResult.replaceAll("seventegn", "17")
                        calcResult = calcResult.replaceAll("seventeen", "17")
                        calcResult = calcResult.replaceAll("seven", "7")
                        calcResult = calcResult.replaceAll("aventeen", "17")
                        calcResult = calcResult.replaceAll("eighteen", "18")
                        calcResult = calcResult.replaceAll("eight", "8")
                        calcResult = calcResult.replaceAll("nineteen", "19")
                        calcResult = calcResult.replaceAll("nine", "9")

                        calcResult = calcResult.replaceAll(" ", "") //remove all spaces

                        console.log(calcResult);
                        try {
                            calcResult = eval(calcResult);
                            console.log("=", calcResult)
                        } catch (e) {} //just suppress any errors
                        let possibleAnswer = answers.find(answer => answer.innerText == calcResult)
                        if (possibleAnswer && typeof(calcResult) == "number") {
                            solved = true
                            possibleAnswer.click()
                        }
                    }
                }

                //attempt to run detection without image processing
                loadScript("https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/1.0.19/tesseract.min.js", () => {
                    Tesseract.recognize(captcha).then(result => {
                        console.log("first guess:", result.text)
                        attemptSolving(result.text)
                    }).then(() => {
                        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jimp/0.16.1/jimp.js", () => {
                            jimp.read(captcha.src).then(image => {
                                image.normalize();
                                image.getBase64Async(jimp.MIME_JPEG).then(newImage => {
                                    /*let tag = document.createElement("img");
                                    tag.src = newImage;
                                    document.querySelector(".surf-box .captcha-container").prepend(tag)*/
                                    Tesseract.recognize(newImage).then(result => {
                                        console.log("normalized guess:", result.text)
                                        attemptSolving(result.text)
                                    }).then(() => {
                                        image.invert();
                                        image.threshold({ max: 150 }); //what does this do?
                                        image.getBase64Async(jimp.MIME_JPEG).then(newImage => {
                                            /*let tag2 = document.createElement("img");
                                            tag2.src = newImage;
                                            document.querySelector(".surf-box .captcha-container").prepend(tag)*/
                                            Tesseract.recognize(newImage).then(result => {
                                                console.log("normalized + inverted guess:", result.text)
                                                attemptSolving(result.text)
                                                if (!solved) {
                                                    console.log("could not autosolve");
                                                    if (localStorage["easyhitsforyou_guessrandomly"] == undefined) {
                                                        localStorage["easyhitsforyou_guessrandomly"] = confirm("could not autosolve (WIP feature)! Do you want to try random guessing? (risky & no caching(yet))")
                                                    }
                                                    if (localStorage["easyhitsforyou_guessrandomly"]) {
                                                        answers[Math.ceil(Math.random() * answers.length) - 1].click()
                                                        currentlyLockedCaptcha = ""
                                                    }
                                                }
                                            })
                                        })
                                    })
                                })
                            })
                        })
                    })
                })
            }
        }
    }, 1500)
})();
