CHECKER = (function () {
    "use strict";
    
    function lengthOrder(a, b) {
        if (a.length == b.length) {
            return a.localeCompare(b);
        }
        return a.length - b.length;
    }
    
    function Dictionary(resource) {
        this.resource = resource;
        this.loaded = false;
        this.words = [];
    }
    
    Dictionary.prototype.addWords = function (words) {
        if (words.length > 0 ) {
            this.words[words[0].length] = words;
        }
    };
    
    Dictionary.prototype.checkWord = function (word) {
        
    };
    
    Dictionary.prototype.maxLength = function () {
        return this.words.length;
    };
    
    function loadDictionary(resource) {
        var dictionary = new Dictionary(resource),
            request = new XMLHttpRequest();
            
        request.open("GET", resource, true);
        request.responseType = "text";
        request.onload = function () {
            console.log("Loading " + resource);
            
            var listing = request.response.split("\r\n");
            listing.sort(lengthOrder);
            
            var words = [];
            for (var i = 0; i < listing.length; ++i) {
                var word = listing[i];
                if (words.length > 0 && words[0].length !== word.length) {
                    dictionary.addWords(words);
                    words = [];
                }
                words.push(word);
            }
            dictionary.addWords(words);
                
            // Fill in any gaps.
            for (var length = 0; length < dictionary.maxLength(); ++length) {
                if (!dictionary.words[length]) {
                    dictionary.words[length] = [];
                }
            }
            
            console.log("Loaded " + listing.length + " words from " + resource);
            dictionary.loaded = true;
        };
        request.send();
        
        return dictionary;
    }
    
    return {
        tenhundred: loadDictionary("dict/tenhundred.txt"),
        enable: loadDictionary("dict/enable1.txt")
    };
}());
