EVO = (function () {
    "use strict";
    
    function run(form) {
        var params = {
            dict: null,
            rep: null,
            filter: null,
            pop: null,
            survive: null
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
