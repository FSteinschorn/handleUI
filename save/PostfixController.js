function PostfixController(renderer) {
    var self = {};

    self.postfixes = new Map([
    ["semantic", new Map([
        ["Goal", 100],
        ["goal", 100],
        ["Fulfills", 100],
        ["Tag", 1000],
        ["Sync", 100],
        ["Firstset", 100],
        ["Set", 100]
    ])],
    ["appearance", new Map([
        ["Asset", 1],//["choice1", "choice2", "choice3"]], // dropdown
        ["Paint", 0] // dropdown farbe * [0..9/10]
    ])],
    ["transformations", new Map([
        ["FirstOrientation", 0],
        ["Orientation", 0], // dropdown
        ["Reflect", 1]
    ])],
    ["predicates", new Map([
        ["IfGoal", 100],
        ["IfIs", 100],
        ["IfHas", 100],
        ["IfNotGoal", 100],
        ["IfNotIs", 100],
        ["IfNotHas", 100],
        ["If", 1] // lambda (string)
    ])],
    ["other", new Map([
        ["Probability", -1], // double
        ["Name", 1]
    ])]
    ]);
    self.postfixesPlain = new Map([
        ["Goal", 100],
        ["goal", 100],
        ["Fulfills", 100],
        ["Tag", 1000],
        ["Sync", 100],
        ["Firstset", 100],
        ["Set", 100],
        ["Asset", 1],//["choice1", "choice2", "choice3"]], // dropdown
        ["Paint", 0], // dropdown farbe * [0..9/10]
        ["FirstOrientation", 0],
        ["Orientation", 0], // dropdown
        ["Reflect", 1],
        ["IfGoal", 100],
        ["IfIs", 100],
        ["IfHas", 100],
        ["IfNotGoal", 100],
        ["IfNotIs", 100],
        ["IfNotHas", 100],
        ["If", 1],
        ["Probability", -1], // double
        ["Name", 1],
        ["Void", 100],
        ["Attribute", 100],
        ["Family", 100]
    ]);

    if (!Object.keys) {
        Object.keys = function (obj) {
            var keys = [];
                k;
            for (k in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, k)) {
                    keys.push(k);
                }
            }
            return keys;
        };
    }

    accordionFunction = function (target) {
        self.postfixes.forEach(function (value, key, map) {
            var id = key + "_content";
            var x = document.getElementById(id);
            if (id == target) {
                if (x.className.indexOf("w3-show") == -1) {
                    x.className += " w3-show";
                } else {
                    x.className = x.className.replace(" w3-show", "");
                }
            }
        });
    }

    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 40; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    self.addPostfix = function (parentDiv, settings, type, deleteButton, changeFunction, fulfills) {
        var div = document.createElement('div');
        postfixDivId = makeid();
        div.style = 'position:relative;height:2em;left:2em';

        var id = makeid();

        if (type.constructor == Array) {
            var selector_id = makeid();
            innerHTML = '<select id=' + selector_id + '>';
            var i = type.length;
            for (var i = 0; i < type.length; i++) {
                innerHTML += '<option value="' + type[i] + '">' + type[i] + '</option>';
            }
            innerHTML += '</select>';
            div.innerHTML = "<span class='tag-tag'>" + innerHTML + ": </span>"
            div.innerHTML += "<textarea id=" + id + " name=" + type[0] + "></textarea>";
        } else {
            div.innerHTML = "<span class='tag-tag'>" + type + ": </span>"
            div.innerHTML += "<textarea id=" + id + " name=" + type + "></textarea>";
        }
        
        if (deleteButton) {
            var button = document.createElement('button');
            button.style = 'position:absolute;width:1.5em;right:1em';
            removeButtonId = makeid();
            button.id = removeButtonId;
            var text = document.createTextNode('X');
            button.appendChild(text);
            div.appendChild(button);    
        }

        parentDiv.appendChild(div);
        addFunction(type, id, settings, changeFunction, fulfills);

        if (deleteButton) {
            $('#' + removeButtonId).click(function (div) {
                return function () {
                    parentDiv.removeChild(div);
                    inputChanged();
                }
            }(div));
        }

        if (type.constructor == Array && settings) {
            selector = document.getElementById(selector_id);
            for (var i = 0; i < selector.options.length; i++) {
                if (selector.options[i] == settings.type) selector.selectedIndex = i;
            }
        }

        if (type.constructor == Array) {
            $("#" + selector_id).change(function () {
                selector = document.getElementById(selector_id);
                var selection = selector.options[selector.selectedIndex];
                textarea = document.getElementById(id);
                textarea.setAttribute("name", '' + selection.label);
                addFunction(selection.label, id, settings, changeFunction, fulfills);
                inputChanged();
            });

        }

        return id;
    }

    // create full postfix ui as accordion
    self.addAllPostfixes = function (parentDiv, ruleDescriptor, fulfills) {
        var postfixDiv = document.createElement('div');
        postfixDiv.id = "postfixDiv";
        var idList = new Map();

        postfixDiv.innerHTML = "<div class='w3-accordion w3-light-grey'></div>";
        accordion = postfixDiv.childNodes[0];
        category_counter = 1;
        postfix_counter = 0;
        self.postfixes.forEach(function (value, key, map) {
            var id = key + "_content";
            accordion.innerHTML += "<button onclick='accordionFunction(\"" + id + "\")' class='w3-btn-block w3-left-align'>" + key + "</button><div id='" + id + "' class='w3-accordion-content w3-container'></div>";
            category = accordion.childNodes[category_counter];
            category_counter += 2;
            value.forEach(function (value, key, map) {
                var postfixId = self.addPostfix(category, ruleDescriptor, key, deleteButton = false, changeFunction = null, fulfills);
                idList.set(postfixId, [key, value]);
            })
            postfix_counter = 0;
        });

        parentDiv.appendChild(postfixDiv);

        idList.forEach(function(value, key, map) {
            addFunction(value[0], key, ruleDescriptor, null, fulfills);
        });
        
        // open postfix-categories with entries
        self.postfixes.forEach(function (value, key, map) {
            var id = key + "_content";
            var x = document.getElementById(id);
            if (x.querySelector('.tag-editor-tag') !== null) {
                accordionFunction(id);
            }
        });
        
    }

    /**
        type ... the type of postfix (Goal, goal, ...); can be array
        id ... id of textarea to add function to
        settings ... the javascript object to look for existing tags in
    **/
    addFunction = function (type, id, settings, changeFunction, fulfills) {
        if (!changeFunction) changeFunction = renderer.inputChanged;
        var id = "#" + id;

        //check for existing tag editor
        var oldTags = $(id).tagEditor('getTags') || [];
        if (oldTags.length != 0) oldTags = oldTags[0].tags || [];
        $(id).tagEditor('destroy');

        //check for given input
        if (settings && !oldTags.length > 0) {
            for (var i = 0; i < Object.keys(settings.tags).length; i++) {
                if (settings.tags[i].type == type) oldTags = settings.tags[i].tags;
            }
        }

        // multiple tags possible
        if (self.postfixesPlain.get(type) != 1) {
            // editing rule
            if (settings && type in settings) {
                $(id).tagEditor({
                    delimiter: ";",
                    placeholder: "Enter tags ...",
                    clickDelete: true,
                    maxTags: self.postfixesPlain.get(type),
                    onChange: changeFunction,
                    initialTags: settings[type] || oldTags
                });
            // new rule
            } else {
                if (oldTags.length != 0) {
                    $(id).tagEditor({
                        delimiter: ";",
                        placeholder: "Enter tags ...",
                        clickDelete: true,
                        maxTags: self.postfixesPlain.get(type),
                        onChange: changeFunction,
                        initialTags: oldTags
                    });
                } else {
                    if (type == 'Fulfills' && fulfills) {
                        $(id).tagEditor({
                            delimiter: ";",
                            placeholder: "Enter tags ...",
                            clickDelete: true,
                            maxTags: self.postfixesPlain.get(type),
                            onChange: changeFunction,
                            initialTags: fulfills
                        });
                    } else {
                        $(id).tagEditor({
                            delimiter: ";",
                            placeholder: "Enter tags ...",
                            clickDelete: true,
                            maxTags: self.postfixesPlain.get(type),
                            onChange: changeFunction
                        });
                    }
                }
            }
            // only one tag possible
        } else {
            // editing rule
            if (settings && type in settings) {
                $(id).tagEditor({
                    delimiter: ";",
                    placeholder: "Enter tag ...",
                    clickDelete: true,
                    maxTags: self.postfixesPlain.get(type),
                    onChange: changeFunction,
                    initialTags: settings[type] || oldTags
                });
                // new rule
            } else {
                if (oldTags.length != 0) {
                    $(id).tagEditor({
                        delimiter: ";",
                        placeholder: "Enter tag ...",
                        clickDelete: true,
                        maxTags: self.postfixesPlain.get(type),
                        onChange: changeFunction,
                        initialTags: oldTags
                    });
                } else {
                    if (type == 'Fulfills' && fulfills) {
                        $(id).tagEditor({
                            delimiter: ";",
                            placeholder: "Enter tag ...",
                            clickDelete: true,
                            maxTags: self.postfixesPlain.get(type),
                            onChange: changeFunction,
                            initialTags: fulfills
                        });
                    } else {
                        $(id).tagEditor({
                            delimiter: ";",
                            placeholder: "Enter tag ...",
                            clickDelete: true,
                            maxTags: self.postfixesPlain.get(type),
                            onChange: changeFunction
                        });
                    }
                }
            }
        }
    }

    // add postfixes to ruleDescriptor
    // parentDiv ... the dom element in which to search
    // parentObject ... the javascript object in which to write
    self.applyPostfixes = function (parentDiv, parentObject) {
        if (! ('tags' in parentObject)) {
            parentObject['tags'] = {};
        }
        postfixList = []
        self.postfixesPlain.forEach(function (value, key, map) {
            postfixList.push(key);
        });
        var i = postfixList.length;
        while (i--) {
            if (postfixList[i] == parentDiv.name) {
                var id = parentDiv.id;
                var taglist = $('#' + id).tagEditor('getTags')[0].tags;
                if (taglist.length != 0) parentObject['tags'][Object.keys(parentObject['tags']).length] = { type: parentDiv.name, tags: taglist };
            }
        }
        for (var child = 0; child < parentDiv.childNodes.length; child++) {
            self.applyPostfixes(parentDiv.childNodes[child], parentObject);
        }

    }

    // append postfix string representation in parentObject to ruleString
    self.appendPostfixString = function (parentObject, ruleString, indentation) {
        if (!('tags' in parentObject)) return ruleString;
        if (!indentation) indentation = 1;
        var indString = "";
        for (var i = 0; i < indentation; i++) indString += "\t";
        for (var i = 0; i < Object.keys(parentObject['tags']).length; i++) {
            var type = parentObject['tags'][i]['type'];
            var tags = parentObject['tags'][i]['tags'];
            ruleString += "\n" + indString + "." + type + "(";
            for (var j = 0; j < tags.length; j++) {
                ruleString += "\"" + tags[j] + "\"";
                if (j != tags.length - 1) ruleString += ", ";
            }
            ruleString += ")";
        }
        return ruleString;
    }

    // parse code and append postfixes to rule
    // rule ... rule desriptor to append the parsed postfixes to
    // code ... array of code elements containing postfixes
    self.parsePostfixes = function (rule, code) {
        var OUTSIDE = 1, INSIDE = 2;

        if (!('tags' in rule)) {
            rule['tags'] = {};
        }

        var mode = OUTSIDE;
        var counter = 0;
        var postfixType, taglist = [];
        while (counter < code.length) {
            switch (mode) {
                case OUTSIDE:
                    if (code[counter].ValueText == '.' && self.postfixesPlain.get(code[counter + 1].ValueText) != undefined) {
                        postfixType = code[counter + 1].ValueText;
                        taglist = [];
                        mode = INSIDE;
                        counter += 3;
                    } else {
                        counter += 1;
                    }
                    break;
                case INSIDE:
                        // argument seperator
                    if (code[counter].ValueText == ',') {
                        counter += 1;
                        // end of arguments
                    } else if (code[counter].ValueText == ')') {
                        if (taglist.length != 0) rule['tags'][Object.keys(rule['tags']).length] = { type: postfixType, tags: taglist };
                        mode = OUTSIDE;
                        counter += 1;
                        // enum types
                    } else if (code[counter + 1].ValueText == '.' && code[counter + 2].ValueText != ',' && code[counter + 3].ValueText != ')') {
                        taglist.push(code[counter].ValueText + '.' + code[code + 2].ValueText);
                        counter += 3;
                        // other argument
                    } else {
                        taglist.push(code[counter].ValueText);
                        counter += 1;
                    }
                        break;
                default:
                    break;
            }
        }


        return rule;
    }

    return self;
}