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
    
    function randomSymbol() {
        return randomElement("abcdefghijklmnopqrstuvwxyz0123456789 .,'");
    }
    
    function freeScore(dictionary, sequence) {
        var maxSize = Math.min(dictionary.maxLength(), sequence.length);
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
    
    function Entity(sequence, representation) {
        this.sequence = sequence;
        this.representation = representation;
        this.score = null;
    }
    
    function RawSequence(minLength, maxLength, mutations) {
        this.minLength = minLength;
        this.maxLength = maxLength;
        this.mutations = mutations;
    }
    
    RawSequence.prototype.createRandom = function() {
        var length = randomInt(this.minLength, this.maxLength),
            sequence = "";
        
        while (sequence.length < length) {
            sequence += randomSymbol();
        }
        
        return new Entity(sequence, sequence);
    };
    
    RawSequence.prototype.createMutant = function(parent) {
        var mutation = randomElement[this.mutations],
            sequence = mutation(parent.representation);
        
        return new Entity(sequence, sequence);
    };
    
    function addSymbolRaw(text) {
        var slot = randomInt(0, text.length);
        return text.slice(0, slot) + randomSymbol() + text.slice(slot);
    }
    
    function removeSymbolRaw(text) {
        var slot = randomInt(0, text.length);
        return text.slice(0, slot) + text.slice(slot + 1);
    }
    
    function changeSymbolRaw(text) {
        var slot = randomInt(0, text.length);
        return text.slice(0, slot) + randomSymbol() + text.slice(slot + 1);
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
    
    CountSequence.prototype.createRandom = function() {
        var representation = {
                count: randomInt(this.minLength, this.maxLength),
                pattern: randomSymbol()
            },
            sequence = countToSequence(representation);

        return new Entity(sequence, representation);
    };
    
    CountSequence.prototype.createMutant = function(parent) {
        var mutation = randomElement[this.mutations],
            representation = mutation(parent.representation);
        
        return new Entity(countToSequence(representation), representation);
    };
    
    function changeCountSymbol(representation) {
        return {
            count: representation.count,
            pattern: randomSymbol()
        };
    }
    
    function increaseCount(representation) {
        return {
            count: representation.count + 1,
            pattern: representation.pattern
        };
    }
    
    function decreaseCount(representation) {
        return {
            count: Math.max(0, representation.count - 1),
            pattern: representation.pattern
        };
    }
    
    function defaultCount(min, max) {
        return new CountSequence(min, max, [changeCountSymbol, increaseCount, decreaseCount]);
    }
       
    function Evolver(params) {
        var size = parseInt(params.population_size),
            generation_count = parseInt(params.generations),
            survive_percent = parseInt(params.survive_percent),
            survive_fraction = Math.abs((survive_percent.isNaN() ? 10 : survive_percent) / 100),
            dict = CHECKER[params.dictionary],
            scores = {
                free: freeScore,
                split: splitScore
            };
        
        this.dictionary = CHECKER[params.dictionary];
        this.population_size = size.isNaN() ? 1000 : clamp(size, 10, 10000);
        this.generations = generation_count.isNaN() ? 50 : clamp(generation_count, 1, 1000);
        this.survivors = Math.ceil(this.population_size * clamp(survive_fraction, 0, 1));
        this.score = scores[params.score] ? scores[params.score] : splitScore;
        this.repr = (params.representation === "count" ? defaultCount : defaultRaw)(1, 20);
       
        this.population = [];
        this.generation = 0;
        
        while (this.population.length < this.population_size) {
            this.population.push(this.randomEntity());
        }
    }
    
    Evolver.prototype.randomEntity = function () {
        return this.repr.createRandom();
    };
    
    Evolver.prototype.mutantEntity = function () {
        var randomParent = this.population[randomInt(0, this.survivors)];        
        return this.repr.createMutant(randomParent);
    };
    
    Evolver.prototype.scorePopulation = function () {
        for (var e = 0; e < this.population.length; ++e) {
            var entity = this.population[e];
            
            if (entity.score === null) {
                entity.score = this.score(this.dictionary, entity.sequence);
            }
        }        
        this.population.sort(function (a, b) { return a.score - b.score; });
        
        console.log("Max score: " + this.population[0].score);
    };
    
    Evolver.prototype.step = function () {
        this.scorePopulation();
        
        // Cull:
        this.population.splice(this.survivors);
        
        while (this.population.length < this.population_size) {
            this.population.push(this.mutantEntity());
        }
        
        console.log("Done step");
    };
    
    Evolver.prototype.isDone = function () {
        return this.generation >= this.generation_count;
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
        
        console.log(JSON.stringify(evolver));
    }
    
    window.onload = function(e) {
        console.log("window.onload", e, Date.now());
        window.setInterval(updateEvolver, 16);
    };
    
    return {
        run: run
    };
}());
