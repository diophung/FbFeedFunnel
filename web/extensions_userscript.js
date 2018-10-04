// ==UserScript==
// @name         FacebookFeedFunnel
// @author       Dio Phung (inspired by Unsponsored & SocialFixer)
// @namespace    http://tampermonkey.net/
// @match        https://www.facebook.com/*
// @run-at       document-idle
// @grant        none
//
// ==/UserScript==

(function () {
    'use strict';
    // Selectors
    var streamSelector = 'div[id^="topnews_main_stream"]';
    var storySelector = 'div[id^="hyperfeed_story_id"]';
    //todo: get nodes from CriteriaService
    var searchedNodes = [
        {
            // Sponsored
            'selector': ['.userContentWrapper div > span > a:not([title]):not([role]):not(.UFICommentActorName):not(.uiLinkSubtle):not(.profileLink)',
                '.fbUserContent div > span > a:not([title]):not([role]):not(.UFICommentActorName):not(.uiLinkSubtle):not(.profileLink)'],
            'content': {
                'en': ['Sponsored', 'Chartered', 'Trump', 'trump', 'ICO', 'token sale'], //todo: get keywords from KeyWordService
                'vi' : ['Trung quốc', 'ăn ngon', 'mặc đẹp', 'ICO', 'xe sang', 'token sale']
            }
        },
        {
            // Suggested Post
            'selector': ['.userContentWrapper > div > div > span',
                '.fbUserContent > div > div > span',
                '.fbUserContent > div'],
            'content': {
                'en': ['Suggested Post', 'Reccomended fer ye eye', 'Trump', 'trump'],
                'vi' : ['Bài viết được giới thiệu', 'Trung quốc', 'ăn ngon', 'mặc đẹp', 'ICO', 'xe sang', 'token sale']
            }
        },
        {
            // Popular Live Video
            'selector': ['.userContentWrapper > div > div > div:not(.userContent)',
                '.fbUserContent > div > div > div:not(.userContent)'],
            'exclude': function (node) {
                if (!node) {
                    return true;
                }
                return (node.children && node.children.length);
            },
            'content': {
                'en': ['Popular Live Video', 'Trump', 'trump'],
                'vi' : ['Video live phổ biến', 'Trung quốc', 'ăn ngon', 'mặc đẹp', 'ICO', 'xe sang', 'token sale']
            }
        }];

    var lang = document.documentElement.lang;
    var contentSelector = (('innerText' in document.documentElement) ? 'innerText' : 'textContent');
    var mutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    // Default to 'en' when the current language isn't yet supported
    for (var i = 0; i < searchedNodes.length; i++) {
        if (searchedNodes[i].content[lang]) {
            searchedNodes[i].content = searchedNodes[i].content[lang];
        }
        else {
            searchedNodes[i].content = searchedNodes[i].content.en;
        }
    }

    var body, stream, observer;

    function block(story) {
        if (!story) {
            return;
        }
        story.remove();
    }

    //todo: frequency, friends network effect, influencer effect,
    function shouldBlocked(story) {
        if (!story) {
            return false;
        }
        var nodes, nodeContent, type, nodeSelector, node;
        var target;
        for (type = 0; type < searchedNodes.length; type++) {
            for (nodeSelector = 0; nodeSelector < searchedNodes[type].selector.length; nodeSelector++) {
                nodes = story.querySelectorAll(searchedNodes[type].selector[nodeSelector]);

                for (node = 0; node < nodes.length; node++) {
                    nodeContent = nodes[node][contentSelector];

                    if (nodeContent) {
                        for (target = 0; target < searchedNodes[type].content.length; target++) {
                            if (searchedNodes[type].exclude && searchedNodes[type].exclude(nodes[node])) {
                                continue;
                            }

                            //v0.1: block if the text contains keywords
                            if (nodeContent.trim().indexOf(searchedNodes[type].content[target]) > -1) { //todo: summarize content into keywords and filter using NLP
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    //todo: provide UI to allow user input
    function process() {
        // Locate the stream every iteration to allow for FB SPA navigation which
        // replaces the stream element
        stream = document.querySelector(streamSelector);
        if (!stream) {
            return;
        }

        var stories = stream.querySelectorAll(storySelector);
        if (!stories.length) {
            return;
        }

        for (var i = 0; i < stories.length; i++) {
            if (shouldBlocked(stories[i])) {
                block(stories[i]);
            }
        }
    }

    if (mutationObserver) {
        body = document.querySelector('body');
        if (!body) {
            return;
        }

        observer = new mutationObserver(process);
        observer.observe(body, {
            'childList': true,
            'subtree': true
        });
    }
})();
