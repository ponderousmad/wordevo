EVO = (function () {
    "use strict";
    
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
        
        console.log(JSON.stringify(params));
    }
    
    return {
        run: run
    };
}());
