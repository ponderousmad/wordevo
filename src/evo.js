EVO = (function () {
    "use strict";

    function clamp(value, min, max) {
        return Math.min(Math.max(min, value), max);
    }
    
    function randomInt(min, max) {
        return Math.min(Math.floor(min + Math.random() * (max - min)), max - 1);
    }
    
    function randomElement(list) {
        return list[randomInt(0, list.length)];
    }
    
    function freeScore(dictionary, sequence) {
        var maxSize = Math.min(dictionary.maxLength(), sequence.length),
            score = 0;

        for (var size = 1; size < maxSize; ++size) {
            for (var i = 0; i < sequence.length - size; ++i) {
                if (dictionary.checkWord(sequence.slice(i, i + size))) {
                    score += 1;
                }
            }
        }
        return score;
    }
    
    var splitter = new RegExp("[ .,]");
    
    function splitScore(dictionary, sequence) {
        var parts = sequence.split(splitter),
            score = 0;
        
        for (var p = 0; p < parts.length; ++p) {
            if (dictionary.checkWord(parts[p])) {
                score += 1;
            }
        }
        return score;
    }
    
    function splitLengthScore(dictionary, sequence) {
        var parts = sequence.split(splitter),
            score = 0;
        
        for (var p = 0; p < parts.length; ++p) {
            var part = parts[p];
            if (dictionary.checkWord(parts[p])) {
                score += part.length;
            }
        }
        return score;
    }
    
    function splitLengthAdjustedScore(dictionary, sequence) {
        return splitLengthScore(dictionary, sequence) - sequence.length * 0.125;
    }
    
    function Entity(sequence, representation) {
        this.sequence = sequence;
        this.representation = representation;
        this.score = null;
    }
    
    Entity.prototype.toString = function() {
        var repString = this.sequence === this.representation ? "" : JSON.stringify(this.representation);
        return this.score + ": " + this.sequence + repString;
    };
    
    function RawSequence(minLength, maxLength, mutations) {
        this.minLength = minLength;
        this.maxLength = maxLength;
        this.mutations = mutations;
    }
    
    RawSequence.prototype.createRandom = function(symbolGenerator) {
        var length = randomInt(this.minLength, this.maxLength),
            sequence = "",
            prev = null;

        while (sequence.length < length) {
            var symbol = symbolGenerator(prev);
            sequence += symbol;
            prev = symbol;
        }
        
        return new Entity(sequence, sequence);
    };
    
    RawSequence.prototype.createMutant = function(parent, symbolGenerator) {
        var mutation = randomElement(this.mutations),
            sequence = mutation(parent.representation, symbolGenerator);
        
        return new Entity(sequence, sequence);
    };
    
    function addSymbolRaw(text, symbolGenerator) {
        var slot = randomInt(0, text.length),
            prev = slot > 0 ? text[slot-1] : null;
        
        return text.slice(0, slot) + symbolGenerator(prev) + text.slice(slot);
    }
    
    function removeSymbolRaw(text, symbolGenerator) {
        var slot = randomInt(0, text.length);
        return text.slice(0, slot) + text.slice(slot + 1);
    }
    
    function changeSymbolRaw(text, symbolGenerator) {
        var slot = randomInt(0, text.length),
            prev = slot > 0 ? text[slot-1] : null;
        return text.slice(0, slot) + symbolGenerator(prev) + text.slice(slot + 1);
    }
    
    function defaultRaw(min, max) {
        return new RawSequence(min, max, [addSymbolRaw, removeSymbolRaw, changeSymbolRaw]);
    }
    
    function CountSequence(minLength, maxLength, mutations) {
        this.minLength = minLength;
        this.maxLength = maxLength;
        this.mutations = mutations;
    }
    
    function countToSequence(representation) {
        var sequence = "";
        for (var i = 0; i < representation.count; ++i) {
            sequence += representation.pattern;
        }
        return sequence;
    }
    
    CountSequence.prototype.createRandom = function(symbolGenerator) {
        var representation = {
                count: randomInt(this.minLength, this.maxLength),
                pattern: symbolGenerator()
            },
            sequence = countToSequence(representation);

        return new Entity(sequence, representation);
    };
    
    CountSequence.prototype.createMutant = function(parent, symbolGenerator) {
        var mutation = randomElement(this.mutations),
            representation = mutation(parent.representation, symbolGenerator);
        
        return new Entity(countToSequence(representation), representation);
    };
    
    function changeCountSymbol(representation, symbolGenerator) {
        return {
            count: representation.count,
            pattern: symbolGenerator()
        };
    }
    
    function increaseCount(representation, symbolGenerator) {
        return {
            count: representation.count + 1,
            pattern: representation.pattern
        };
    }
    
    function decreaseCount(representation, symbolGenerator) {
        return {
            count: Math.max(0, representation.count - 1),
            pattern: representation.pattern
        };
    }
    
    function defaultCount(min, max) {
        return new CountSequence(min, max, [changeCountSymbol, increaseCount, decreaseCount]);
    }
    
    function setupProbabilities(symbols, frequencies, useBigram) {
        var set = [],
            SET_SIZE = 100000,
            aCode = "a".charCodeAt(0),
            zCode = "z".charCodeAt(0),
            isLetter = function (symbol) {
                var code = symbol.charCodeAt(0);
                return aCode <= code && code <= zCode;
            },
            bigrams = {};
        
        if (!frequencies[" "]) {
            frequencies[" "] = 0.08;
        }
        if (!frequencies["."]) {
            frequencies["."] = 0.03;
        }
        if (!frequencies[","]) {
            frequencies[","] = 0.01;
        }
        
        for (var digit = 0; digit <= 9; ++digit) {
            if (!frequencies[digit.toString()]) {
                frequencies[digit.toString()] = frequencies[String.fromCharCode(zCode)];
            }
        }
        for (var i = 0; i < symbols.length; ++i) {
            var symbol = symbols[i],
                count = Math.ceil(frequencies[symbol] * SET_SIZE);
            for (var c = 0; c < count; ++c) {
                set.push(symbol);
            }
        }

        if (useBigram) {
            for (var entry in frequencies) {
                if (entry.length == 2 && frequencies.hasOwnProperty(entry)) {
                    var first = entry[0],
                        number = Math.ceil(frequencies[entry] * SET_SIZE),
                        biset = bigrams[first];
                        
                    biset = biset ? biset : [];
                    
                    for (var n = 0; n < number; ++n) {
                        biset.push(entry[1]);
                    }
                    
                    bigrams[first] = biset;
                }
            }
        }
        
        return function (prev) {
            if (useBigram && Math.random() > 0.25) {
                if ((!prev || !(isLetter(prev) || prev === "'"))) {
                    prev = "?";
                }
                var biset = bigrams[prev];
                if (biset) {
                    return randomElement(biset);
                }
            }
            return randomElement(set);
        };
    }
       
    function Evolver(params) {
        var size = parseInt(params.population_size),
            generation_count = parseInt(params.generations),
            survive_percent = parseInt(params.survive_percent),
            survive_fraction = Math.abs((isNaN(survive_percent) ? 10 : survive_percent) / 100),
            dict = CHECKER[params.dictionary],
            bigram = params.symbol_distribution === "bigram",
            scores = {
                free: freeScore,
                split: splitScore,
                splitLength: splitLengthScore,
                splitLengthAdjusted: splitLengthAdjustedScore,
            },
            symbols = "abcdefghijklmnopqrstuvwxyz0123456789 .,'";
        
        this.dictionary = CHECKER[params.dictionary];
        this.population_size = isNaN(size) ? 1000 : clamp(size, 10, 100000);
        this.generations = isNaN(generation_count) ? 50 : clamp(generation_count, 1, 10000);
        this.survivors = Math.ceil(this.population_size * clamp(survive_fraction, 0, 1));
        this.score = scores[params.score] ? scores[params.score] : splitScore;
        this.repr = (params.representation === "count" ? defaultCount : defaultRaw)(1, 25);
        
        this.symbolGenerator = function() { return randomElement(symbols); };
        
        if (bigram || params.symbol_distribution === "unigram") {
            this.symbolGenerator = setupProbabilities(symbols, this.dictionary.frequencies(), bigram);
        }
       
        this.population = [];
        this.generation = 0;
        
        this.generationElement = document.getElementById("generation");
        this.scoreElement = document.getElementById("max_score");
        this.topElement = document.getElementById("top_sequences");
      
        while (this.population.length < this.population_size) {
            this.population.push(this.randomEntity());
        }
    }
    
    Evolver.prototype.randomEntity = function () {
        return this.repr.createRandom(this.symbolGenerator);
    };
    
    Evolver.prototype.mutantEntity = function () {
        var randomParent = this.population[randomInt(0, this.survivors)];        
        return this.repr.createMutant(randomParent, this.symbolGenerator);
    };
    
    Evolver.prototype.scorePopulation = function () {
        for (var e = 0; e < this.population.length; ++e) {
            var entity = this.population[e];
            
            if (entity.score === null) {
                entity.score = this.score(this.dictionary, entity.sequence);
            }
        }
        
        // Sort by descending score.
        this.population.sort(function (a, b) { return b.score - a.score; });
        
        this.scoreElement.innerHTML = this.population[0].score.toString();
        this.topElement.innerHTML = "";
        for (var t = 0; t < Math.min(this.population.length, 10); ++t) {
            var element = document.createElement("li");
            element.innerHTML = this.population[t].toString();
            this.topElement.appendChild(element);
        }
    };
    
    Evolver.prototype.step = function () {
        if (!this.dictionary.loaded) {
            return;
        }
        
        this.scorePopulation();
        
        // Cull:
        this.population.splice(this.survivors);
        
        while (this.population.length < this.population_size) {
            this.population.push(this.mutantEntity());
        }
        
        this.generation += 1;
        this.generationElement.innerHTML = this.generation.toString();
    };
    
    Evolver.prototype.isDone = function () {
        return this.generation >= this.generations;
    };
    
    var evolver = null;
    
    function updateEvolver() {
        if (evolver === null || evolver.isDone()) {
            return;
        }
        evolver.step();
    }
    
    function run(form) {
        var params = {
            dictionary: null,
            representation: null,
            symbol_distribution: null,
            score: null,
            population_size: null,
            generations: null,
            survive_percent: null
        };
        for (var p in params) {
            if (params.hasOwnProperty(p)) {
                params[p] = form.elements[p].value;
            }
        }
        
        evolver = new Evolver(params);
        console.log("Starting evolve");
    }
    
    window.onload = function(e) {
        console.log("window.onload", e, Date.now());
        window.setInterval(updateEvolver, 16);
    };
    
    return {
        run: run
    };
}());
