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
    
    function mid(low, high) {
        return low + Math.floor((high - low) / 2);
    }
    
    Dictionary.prototype.checkWord = function (word) {
        // Use binary search technique described here:
        // http://ejohn.org/blog/revised-javascript-dictionary-search/
        
        if (word.length > this.maxLength() || word.length === 0) {
            return false;
        }
        
        var words = this.words[word.length],
            low = 0,
            high = words.length,
            next = mid(low, high);
       
        while (low !== high) {
            var nextWord = words[next];
            if (word === nextWord) {
                return true;
            }
            if (nextWord < word && low !== next) {
                low = next;
            } else {
                high = next;
            }
            next = mid(low, high);
        }
        return false;
    };
    
    Dictionary.prototype.maxLength = function () {
        return this.words.length - 1;
    };
    
    function loadDictionary(resource, sorted) {
        var dictionary = new Dictionary(resource),
            request = new XMLHttpRequest();
            
        request.open("GET", resource, true);
        request.responseType = "text";
        request.onload = function () {
            console.log("Loading " + resource);
            
            var listing = request.response.split("\r\n");
            var startTime = Date.now();
            if (!sorted) {
                listing.sort(lengthOrder);
            }
            var sortEnd = Date.now();
            
            console.log("Sort time: " + (sortEnd - startTime) / 1000);
            
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
            
            var buildEnd = Date.now();
            
            console.log("Build time: " + (buildEnd - sortEnd) / 1000);
                
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
        tenhundred: loadDictionary("dict/tenhundred.txt", false),
        enable: loadDictionary("dict/enable1.txt", true)
    };
}());
