var App = {
    baseApiUrl:'/api',
    getScript: function(url,success){
        $.ajax({
            url: "/assets/js/scripts/" + url + ".js",
            dataType: "script",
            success: success,
            cache: true
        });
    },
    getFormData: function(form){
        return $(form).serializeObject();/*.reduce(function(obj, item) {
            obj[item.name] = item.value;
            return obj;
        }, {});*/
    },
    templates: {
        loaded: [],
        save:function (url, callback) {
            return function (response) {
                App.templates.loaded[url] = response;
                if (callback != undefined) {
                    return callback(response);
                }
            };
        },
        load: function (url, callback) {
            var loaded = App.templates.loaded[url];
            if (loaded != undefined) {
                callback(loaded);
                return loaded;
            }
            return App.templates.ajax(url, this.save(url, callback));
        },
        ajax: function (url, callback) {
            $.ajax({
                url: "/assets/html/" + url + ".html",
                cache: true,
                contentType: false,
                processData: false,
                dataType: 'html',
                type: 'GET',
                success: function (data) {
                    if (callback != undefined) {
                        return callback(data);
                    }
                }
            });
        },
        replace: function (selector, template, restObj) {
            return $(selector).html(App.utils.mustache(template, restObj));
        }
    },
    rest: function (ajaxObject) {
        ajaxObject.url = App.baseApiUrl + ajaxObject.url;
        ajaxObject.cache = false;
        if (ajaxObject.data != undefined && ajaxObject.method != 'GET' && ajaxObject.contentType == undefined) {
            ajaxObject.data = JSON.stringify(ajaxObject.data);
        }
        ajaxObject.contentType = (ajaxObject.contentType == undefined) ? 'application/json; charset=UTF-8' : ajaxObject.contentType;
        ajaxObject.error2=ajaxObject.error;
        ajaxObject.error=function (e) {
            if(typeof(ajaxObject.error2) == 'function'){
                ajaxObject.error2(e.responseJSON,e);
            }
        };
        return $.ajax(ajaxObject);
    },
    utils: {
        removeEmptyProperties: function(obj){
        for (var i in obj) {
            if (obj[i] === null || obj[i] === "") {
                delete obj[i];
            }else if(typeof obj[i] === 'object'){
                App.utils.removeEmptyProperties(obj[i]);
            }
        }
        return obj;
        },
        zeroPad: function(num, size) {
            var s = num+"";
            while (s.length < size) s = "0" + s;
            return s;
        },
        getQueryParam: function (key) {
            var result = "",
                tmp = [];
            location.search
                .replace("?", "")
                //.substr(1)
                .split("&")
                .forEach(function (item) {
                    tmp = item.split("=");
                    if (tmp[0] === key) result = decodeURIComponent(tmp[1]);
                });
            return result;
        },
        getCookie: function (name) {
            var matches = document.cookie.match(new RegExp(
                "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
            ));
            return matches ? decodeURIComponent(matches[1]) : undefined;
        },
        setCookie: function (name, value, options) {
            options = options || {
                    "path" : "/",
                    "expires" : 60*60*24*30
                };

            var expires = options.expires;

            if (typeof expires == "number" && expires) {
                var d = new Date();
                d.setTime(d.getTime() + expires * 1000);
                expires = options.expires = d;
            }
            if (expires && expires.toUTCString) {
                options.expires = expires.toUTCString();
            }

            value = encodeURIComponent(value);

            var updatedCookie = name + "=" + value;

            for (var propName in options) {
                updatedCookie += "; " + propName;
                var propValue = options[propName];
                if (propValue !== true) {
                    updatedCookie += "=" + propValue;
                }
            }
            document.cookie = updatedCookie;
        },
        deleteCookie: function (name) {
            App.utils.setCookie(name, "", {
                expires: -1
            })
        },
        mustache: function (template, restObj) {
            var obj=restObj;
            if(Array.isArray(obj)){
                obj={entity: restObj};
            }
            var recursiveReplace = function(obj)
            {
                for (var k in obj)
                {
                    if (typeof obj[k] == "object" && obj[k] !== null){
                        recursiveReplace(obj[k]);
                    }
                    if(k.indexOf('.')!=-1){
                        var newK = k.replace(/\./g,'_');
                        obj[newK] = obj[k];
                        delete obj[k];
                        k = newK;
                    }
                }
                return obj;
            };
            obj = recursiveReplace(obj);
            return Mustache.to_html(template, obj);
        },
    },
    user: {
        model: null,
        isLogined: function () {
            return (App.user.model!=null);
        },
    },
    router: new Router(),
    localProperty : function (k,v) {
        var storage = App.getStorage();
        try{
            if(v==undefined) {
                v=storage.getItem("prop."+k);
                var json=JSON.parse(v);
                return (json)?json:v;
            }
    
            if(typeof v == "object"){
                v=JSON.stringify(v);
            }
            return storage.setItem("prop."+k,v)
        }catch (e){
            return null;
        }
    },
    storage : null,
    getStorage : function (){
        if(App.storage!=null){
            return App.storage;
        }
        try{
            window.localStorage.setItem('test', 'test');
            if(window.localStorage.getItem('test')=='test'){
                return App.storage=window.localStorage;
            }
            throw new Error();
        }catch (e){
            return App.storage=window.sessionStorage;
        }
    }
};

History.Adapter.bind(window, "statechange", function() {
    window.urlParams = $.deparam(window.location.search.substring(1));
});
$(window).on('load',function(){
    window.urlParams = $.deparam(window.location.search.substring(1));
});

(function($){
    $.fn.serializeObject = function(){

        var self = this,
            json = {},
            push_counters = {},
            patterns = {
                "validate": /^[a-zA-Z][a-zA-Z0-9_]*(?:\[(?:\d*|[a-zA-Z0-9_\.]+)\])*$/,
                "key":      /[a-zA-Z0-9_\.]+|(?=\[\])/g,
                "push":     /^$/,
                "fixed":    /^\d+$/,
                "named":    /^[a-zA-Z0-9_\.]+$/
            };


        this.build = function(base, key, value){
            base[key] = value;
            return base;
        };

        this.push_counter = function(key){
            if(push_counters[key] === undefined){
                push_counters[key] = 0;
            }
            return push_counters[key]++;
        };

        var serializedArray=$(this).serializeArray();
        var newArray=[];
        var findFirstByKey=function (array,name) {
            var result=null;
            array.forEach(function (el) {
                if(el.name===name){
                    result=el;
                    return;
                }
                return;
            });
            return result;
        };
        serializedArray.forEach(function (el) {
            var prev = findFirstByKey(newArray, el.name)
            if(prev==null){
                newArray.push(el);
            }else{
                if(!Array.isArray(prev.value)){
                    prev.value = [prev.value];
                }
                prev.value.push(el.value);
            }
        });
        $.each(newArray, function(){

            // skip invalid keys
            if(!patterns.validate.test(this.name)){
                return;
            }

            var k,
                keys = this.name.match(patterns.key),
                merge = this.value,
                reverse_key = this.name;

            while((k = keys.pop()) !== undefined){

                // adjust reverse_key
                reverse_key = reverse_key.replace(new RegExp("\\[" + k + "\\]$"), '');

                // push
                if(k.match(patterns.push)){
                    merge = self.build([], self.push_counter(reverse_key), merge);
                }

                // fixed
                else if(k.match(patterns.fixed)){
                    merge = self.build([], k, merge);
                }

                // named
                else if(k.match(patterns.named)){
                    merge = self.build({}, k, merge);
                }
            }

            json = $.extend(true, json, merge);
        });

        return json;
    };
})(jQuery);
