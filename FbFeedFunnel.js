// ==UserScript==
// @name         FbFeedFunnel
// @author       Dio Phung, 
// @namespace    http://tampermonkey.net/
// @match        https://www.facebook.com/*
// @run-at       document-idle
// @grant        none
//
// ==/UserScript==

(function() {
    'use strict';
    // Selectors
    var streamSelector = 'div[id^="topnews_main_stream"]';
    var storySelector = 'div[id^="hyperfeed_story_id"]';
    var searchedNodes = [{
        // Sponsored
        'selector': ['.userContentWrapper div > span > a:not([title]):not([role]):not(.UFICommentActorName):not(.uiLinkSubtle):not(.profileLink)', 
                     '.fbUserContent div > span > a:not([title]):not([role]):not(.UFICommentActorName):not(.uiLinkSubtle):not(.profileLink)'],
        'content': {
            'en':      ['Sponsored', 'Chartered', 'Trump', 'trump'],
            'vi':      ['Được tài trợ'],
        }
    }, 
    
    {
        // Suggested Post
        'selector': ['.userContentWrapper > div > div > span', 
                     '.fbUserContent > div > div > span', 
                     '.fbUserContent > div'],
        'content': {
            'en':        ['Suggested Post', 'Reccomended fer ye eye', 'Trump', 'trump'],
            'vi':        ['Bài viết được đề xuất']
        }
    }, 
    {
        // Popular Live Video
        'selector': ['.userContentWrapper > div > div > div:not(.userContent)', 
                     '.fbUserContent > div > div > div:not(.userContent)'],
        'exclude': function(node) {
            if(!node) {
                return true;
            }
            return (node.children && node.children.length);
        },
        'content': {
            'en':        ['Popular Live Video', 'trump', 'Trump'],
            'vi':        ['Video trực tiếp phổ biến']
        }
    }];

    var language = document.documentElement.lang;
    var nodeContentKey = (('innerText' in document.documentElement) ? 'innerText' : 'textContent');
    var mutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    // Default to 'en' when the current language isn't yet supported
    var i;
    for(i = 0; i < searchedNodes.length; i++) {
        if(searchedNodes[i].content[language]) {
            searchedNodes[i].content = searchedNodes[i].content[language];
        }
        else {
            searchedNodes[i].content = searchedNodes[i].content.en;
        }
    }

    var body;
    var stream;
    var observer;

    function block(story) {
        if(!story) { return; }
        story.remove();
    }

    function shouldBeBlocked(story) {
        if(!story) { return false;}

        var nodes;
        var nodeContent;

        var type;
        var selector;
        var node;
        var target;
        for(type = 0; type < searchedNodes.length; type++) {
            for(selector = 0; selector < searchedNodes[type].selector.length; selector++) {
                nodes = story.querySelectorAll(searchedNodes[type].selector[selector]);
                
                for(node = 0; node < nodes.length; node++) {
                    nodeContent = nodes[node][nodeContentKey];

                    if(nodeContent) {
                        for(target = 0; target < searchedNodes[type].content.length; target++) {
                            if(searchedNodes[type].exclude && searchedNodes[type].exclude(nodes[node])) {
                                continue;
                            }

                            //v0.1: block if the text contains keywords
                            if(nodeContent.trim().indexOf(searchedNodes[type].content[target]) > -1) {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    function process() {
        // Locate the stream every iteration to allow for FB SPA navigation which
        // replaces the stream element
        stream = document.querySelector(streamSelector);
        if(!stream) {
            return;
        }

        var stories = stream.querySelectorAll(storySelector);
        if(!stories.length) {
            return;
        }

        var i;
        for(i = 0; i < stories.length; i++) {
            if(shouldBeBlocked(stories[i])) {
                block(stories[i]);
            }
        }
    }

    if(mutationObserver) {
        body = document.querySelector('body');
        if(!body) {
            return;
        }

        observer = new mutationObserver(process);
        observer.observe(body, {
            'childList': true,
            'subtree': true
        });
    }
})();
