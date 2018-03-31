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
    ["appearence", new Map([
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

    self.addPostfix = function (parentDiv, settings, type, deleteButton, changeFunction, fulfills) {
        var div = document.createElement('div');
        div.style = 'position:relative;height:2em;left:2em';

        var id = makeid();
        var ids = [id];

        if (type.constructor == Array) {
            var selector_id = makeid();
            innerHTML = '<select id=' + selector_id + ' class="ui_selector postfix_selector">';
            for (var i = 0; i < type.length; i++) {
                innerHTML += '<option value="' + type[i] + '">' + type[i] + '</option>';
            }
            innerHTML += '</select>';
            div.innerHTML = "<span class='tag-tag'>" + innerHTML + ": </span>"
            var currentType = type[0];
        } else {
            div.innerHTML = "<span class='tag-tag'>" + type + ": </span>"
            var currentType = type;
        }

        switch (currentType) {

            case 'Paint':
                var inputDiv = document.createElement('div');
                inputDiv.classList.add('postfix_input');
                var innerHTML = '<select id=' + id + ' name=' + currentType + ' class="ui_selector postfix_selector">';
                innerHTML += '<option vaule ="none">none</options>';
                for (var j = 0; j < paintConfig.options[0].values.length; j++) {
                    innerHTML += '<option vaule ="' + paintConfig.options[0].values[j] + '">' + paintConfig.options[0].values[j] + '</options>';
                }
                innerHTML += '</select>';
                var id2 = makeid();
                ids.push(id2);
                innerHTML += '<select id=' + id2 + ' class="ui_selector postfix_selector">';
                for (var j = 0; j < 10; j++) {
                    innerHTML += '<option vaule ="' + j + '">' + j + '</options>';
                }
                innerHTML += '</select>';
                inputDiv.innerHTML += innerHTML;
                div.appendChild(inputDiv);
                break;

            case 'Asset':
                var inputDiv = document.createElement('div');
                inputDiv.classList.add('postfix_input');
                var innerHTML = '<select id=' + id + ' name=' + currentType + ' class="ui_selector postfix_selector">';
                innerHTML += '<option vaule ="none">none</options>';
                for (var j = 0; j < assetConfig.options[0].values.length; j++) {
                    innerHTML += '<option vaule ="' + assetConfig.options[0].values[j] + '">' + assetConfig.options[0].values[j] + '</options>';
                }
                innerHTML += '</select>';
                inputDiv.innerHTML += innerHTML;
                div.appendChild(inputDiv)
                break;

            case 'FirstOrientation':
            case 'Orientation':
                var inputDiv = document.createElement('div');
                inputDiv.classList.add('postfix_input');
                var innerHTML = '<select id=' + id + ' name=' + currentType + ' class="ui_selector postfix_selector">';
                innerHTML += '<option vaule ="none">none</options>';
                for (var j = 0; j < orientationConfig.options[0].values.length; j++) {
                    innerHTML += '<option vaule ="' + orientationConfig.options[0].values[j] + '">' + orientationConfig.options[0].values[j] + '</options>';
                }
                innerHTML += '</select>';
                inputDiv.innerHTML += innerHTML;
                div.appendChild(inputDiv);
                break;

            case 'Reflect':
                var inputDiv = document.createElement('div');
                inputDiv.classList.add('postfix_input');
                var innerHTML = '<select id=' + id + ' name=' + currentType + ' class="ui_selector postfix_selector">';
                innerHTML += '<option vaule ="none">none</options>';
                for (var j = 0; j < reflectionConfig.options[0].values.length; j++) {
                    innerHTML += '<option vaule ="' + reflectionConfig.options[0].values[j] + '">' + reflectionConfig.options[0].values[j] + '</options>';
                }
                innerHTML += '</select>';
                inputDiv.innerHTML += innerHTML;
                div.appendChild(inputDiv);
                break;

            case 'Set':
            case 'Firstset':
                var inputDiv = document.createElement('div');
                inputDiv.classList.add('postfix_input');
                var id2 = makeid();
                ids.push(id2);
                var id3 = makeid();
                ids.push(id3);
                var keyInput = document.createElement("input");
                keyInput.type = "text";
                keyInput.id = id;
                keyInput.name = currentType;
                keyInput.classList.add("ui_inputField");
                keyInput.classList.add("postfix_inputField");
                keyInput.placeholder = "Enter key ...";
                inputDiv.appendChild(keyInput);
                var innerHTML = '<select id=' + id2 + ' class="ui_selector postfix_selector">';
                innerHTML += '<option vaule ="none">none</options>';
                innerHTML += '<option vaule ="bool">bool</options>';
                innerHTML += '<option vaule ="int">int</options>';
                innerHTML += '<option vaule ="double">double</options>';
                innerHTML += '<option vaule ="none">string</options>';
                innerHTML += '</select>';
                inputDiv.innerHTML += innerHTML;
                var valueInput = document.createElement("input");
                valueInput.type = "text";
                valueInput.id = id3;
                valueInput.classList.add("ui_inputField");
                valueInput.classList.add("postfix_inputField");
                valueInput.placeholder = "Enter value ...";
                inputDiv.appendChild(valueInput);
                div.appendChild(inputDiv);
                break;

            case 'Probability':
                var inputDiv = document.createElement('div');
                inputDiv.classList.add('postfix_input');
                var input = document.createElement("input");
                input.type = "text";
                input.id = id;
                input.name = currentType;
                input.classList.add("ui_inputField");
                input.classList.add("postfix_inputField");
                input.placeholder = "Enter probability ...";
                inputDiv.appendChild(input);
                div.appendChild(inputDiv);
                break;

            default:
                var textfield = document.createElement("textarea");
                textfield.id = id;
                textfield.setAttribute("name", currentType);
                div.appendChild(textfield);
                //div.innerHTML += '<textfield id=' + id + ' name=' + currentType + '>';
        }

        if (deleteButton) {
            var button = document.createElement('button');
            button.style = 'position:absolute;width:1.5em;right:1em';
            var removeButtonId = makeid();
            button.id = removeButtonId;
            var text = document.createTextNode('X');
            button.appendChild(text);
            div.appendChild(button);    
        }

        parentDiv.appendChild(div);

        if (type.constructor == Array && settings) {
            var selector = document.getElementById(selector_id);
            for (var i = 0; i < selector.options.length; i++) {
                if (selector.options[i] == settings.type) selector.selectedIndex = i;
            }
            addFunction(settings.type, [id], settings, changeFunction, fulfills);
        } else {
            addFunction(type, ids, settings, changeFunction, fulfills);
        }

        if (deleteButton) {
            $('#' + removeButtonId).click(function (div) {
                return function () {
                    parentDiv.removeChild(div);
                    inputChanged();
                }
            }(div));
        }

        if (type.constructor == Array) {
            $("#" + selector_id).change(function () {
                selector = document.getElementById(selector_id);
                var selection = selector.options[selector.selectedIndex];
                textarea = document.getElementById(id);
                textarea.setAttribute("name", '' + selection.label);
                addFunction(selection.label, [id], settings, changeFunction, fulfills);
                inputChanged();
            });

        }

        return ids;
    };

    // create full postfix ui as accordion
    self.addAllPostfixes = function (parentDiv, rule, fulfills) {
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
                var postfixId = self.addPostfix(category, rule, key, deleteButton = false, changeFunction = null, fulfills);
                idList.set(postfixId, [key, value]);
            });
            postfix_counter = 0;
        });

        parentDiv.appendChild(postfixDiv);

        idList.forEach(function(value, key, map) {
            addFunction(value[0], key, rule, null, fulfills);
        });
        
        // open postfix-categories with entries
        self.postfixes.forEach(function (value, key, map) {
            var id = key + "_content";
            var x = document.getElementById(id);
            if ((x.querySelector('.tag-editor-tag') != null) ||
                (x.querySelector('.postfixUsed') != null)) {
                accordionFunction(id);
            }
        });
        
    };

    // type ... the type of postfix (Goal, goal, ...); can be array
    // id ... id of textarea to add function to
    // settings ... the javascript object to look for existing postfixes in
    addFunction = function (type, ids, settings, changeFunction, fulfills) {
        if (!changeFunction) changeFunction = renderer.inputChanged;

        switch (type) {

            case 'Paint':
                var selector = document.getElementById(ids[0]);
                var toneSelector = document.getElementById(ids[1]);                
                if (selector) {
                    // hide toneSlector
                    toneSelector.style.display = 'none';

                    // add event listeners
                    selector.addEventListener("change", function () {
                            if (selector.selectedIndex > 18) {
                                toneSelector.style.display = 'inline';
                            } else {
                                toneSelector.style.display = 'none';
                            }
                            changeFunction();
                    });
                    toneSelector.addEventListener("change", changeFunction);

                    // fill existing values
                    if (settings) {
                        for (var i = 0; i < Object.keys(settings.postfixes).length; i++) {
                            if (settings.postfixes[i].type == 'Paint')
                                for (var j = 0; j < selector.options.length; j++) {
                                    if (selector.options[j].label == settings.postfixes[i].tags[0]) {
                                        selector.selectedIndex = j;
                                        if (selector.className.indexOf("postfixUsed") == -1) {
                                            selector.className += " postfixUsed";
                                        }
                                        if (j > 20) {
                                            toneSelector.selectedIndex = settings.postfixes[i].tags[1];
                                            toneSelector.style.display = 'inline';
                                        }
                                    }
                                }
                        }
                    }
                }
                break;

            case 'Asset':
            case 'FirstOrientation':
            case 'Orientation':
            case 'Reflect':
                var selector = document.getElementById(ids[0]);
                if (selector) {
                    // add event listeners
                    selector.addEventListener("change", changeFunction);

                    // fill existing values
                    if (settings) {
                        for (var i = 0; i < Object.keys(settings.postfixes).length; i++) {
                            if (settings.postfixes[i].type == type)
                                for (var j = 0; j < selector.options.length; j++) {
                                    if (selector.options[j].label == settings.postfixes[i].tags[0]) {
                                        selector.selectedIndex = j;
                                        if (selector.className.indexOf("postfixUsed") == -1) {
                                            selector.className += " postfixUsed";
                                        }
                                    }
                                }
                        }
                    }
                }
                break;

            case 'Set':
            case 'Firstset':
                var keyField = document.getElementById(ids[0]);
                var selector = document.getElementById(ids[1]);
                var valueField = document.getElementById(ids[2]);
                if (keyField) {
                    // add event listeners
                    selector.addEventListener('input', changeFunction);
                    keyField.addEventListener('input', changeFunction);
                    valueField.addEventListener('input', changeFunction);

                    // fill existing values
                    if (settings) {
                        for (var i = 0; i < Object.keys(settings.postfixes).length; i++) {
                            if (settings.postfixes[i].type == type) {
                                for (var j = 0; j < selector.options.length; j++) {
                                    if (selector.options[j].label == settings.postfixes[i].tags[1]) {
                                        selector.selectedIndex = j;
                                        if (selector.className.indexOf("postfixUsed") == -1) {
                                            selector.className += " postfixUsed";
                                        }
                                    }
                                }
                                keyField.value = settings.postfixes[i].tags[0];
                                valueField.value = settings.postfixes[i].tags[2];
                            }
                        }
                    }
                }
                break;

            case 'Probability':
                var textField = document.getElementById(ids[0]);
                if (textField) {
                    textField.addEventListener('input', changeFunction);
                    if (settings) {
                        for (var i = 0; i < Object.keys(settings.postfixes).length; i++) {
                            if (settings.postfixes[i].type == type) {
                                textField.value = settings.postfixes[i].tags[0];
                                if (textField.className.indexOf("postfixUsed") == -1) {
                                    textField.className += " postfixUsed";
                                }
                            }
                        }
                    }
                }
                break;

            // tags
            default:
                var id = "#" + ids[0];

                //check for existing tag editor
                var oldTags = $(id).tagEditor('getTags') || [];
                if (oldTags.length != 0) oldTags = oldTags[0].tags || [];
                $(id).tagEditor('destroy');

                //check for given input
                if (settings && !oldTags.length > 0 && !$.isEmptyObject(settings.postfixes)) {
                    for (var i = 0; i < Object.keys(settings.postfixes).length; i++) {
                        if (settings.postfixes[i].type == type) oldTags = settings.postfixes[i].tags;
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
                break;
        }
    };

    // add postfixes to ruleDescriptor
    // parentDiv ... the dom element in which to search
    // parentObject ... the javascript object in which to write
    self.applyPostfixes = function (parentDiv, parentObject) {
        if (! ('postfixes' in parentObject)) {
            parentObject['postfixes'] = {};
        }
        postfixList = []
        self.postfixesPlain.forEach(function (value, key, map) {
            postfixList.push(key);
        });
        var i = postfixList.length;
        while (i--) {
            if (postfixList[i] == parentDiv.name) {
                var id = parentDiv.id;

                switch (parentDiv.name) {

                    case 'Paint':
                        var selector = document.getElementById(id);
                        var material = selector.options[selector.selectedIndex].label;
                        if (material == "none") break;
                        if (selector.selectedIndex > 20) {
                            var toneSelector = selector.nextSibling;
                            var tone = toneSelector.options[toneSelector.selectedIndex].label;
                            parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [material, tone] };
                        } else {
                            parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [material] };
                        }
                        break;

                    case 'Asset':
                    case 'FirstOrientation':
                    case 'Orientation':
                    case 'Reflect':
                        var selector = document.getElementById(id);
                        var tag = selector.options[selector.selectedIndex].label;
                        if (tag == "none") break;
                        parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [tag] };
                        break;

                    case 'Set':
                    case 'Firstset':
                        var keyField = document.getElementById(id);
                        var selector = keyField.nextSibling;
                        var valueField = selector.nextSibling;
                        var key = keyField.value;
                        var type = selector.options[selector.selectedIndex].label;
                        var value = valueField.value;
                        switch (type) {
                            case 'bool':
                                if (value == 'True' || value == 'true' || value == 'TRUE' || (!isNaN(value) && Number.parseFloat(value) != 0)) {
                                    parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [key, type, true] };
                                } else {
                                    parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [key, type, false] };
                                }
                                break;
                            case 'int':
                                if (!isNaN(value)) {
                                    parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [key, type, Number.parseInt(value)] };
                                }
                                break;
                            case 'double':
                                if (!isNaN(value)) {
                                    parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [key, type, Number.parseFloat(value)] };
                                }
                                break;
                            case 'string':
                                parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [key, type, value] };
                                break;
                            default:
                                break;
                        }
                        break;

                    case 'Probability':
                        var textField = document.getElementById(id);
                        var string = textField.value;
                        if (!isNaN(string) && string != "") {
                            parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [Number.parseFloat(string)] };
                        } else if (string != "") {
                            parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: [0.0] };
                        }
                        break;

                    default:
                        var taglist = $('#' + id).tagEditor('getTags')[0].tags;
                        if (taglist && (taglist.length != 0)) parentObject['postfixes'][Object.keys(parentObject['postfixes']).length] = { type: parentDiv.name, tags: taglist };
                        break;
                }
             }
        }
        for (var child = 0; child < parentDiv.childNodes.length; child++) {
            self.applyPostfixes(parentDiv.childNodes[child], parentObject);
        }

    };

    // append postfix string representation in parentObject to ruleString
    self.appendPostfixString = function (parentObject, ruleString, indentation) {
        if (!('postfixes' in parentObject)) return ruleString;
        if (!indentation) indentation = 1;
        var indString = "";
        for (var i = 0; i < indentation; i++) indString += "\t";
        for (var i = 0; i < Object.keys(parentObject['postfixes']).length; i++) {
            var type = parentObject['postfixes'][i]['type'];
            var tags = parentObject['postfixes'][i]['tags'];
            ruleString += "\n" + indString + "." + type + "(";

            switch (type) {
                
                case 'Paint':
                    ruleString += tags[0];
                    if (tags.length > 1) ruleString += '(' + tags[1] + ')';
                    break;

                case 'Asset':
                case 'FirstOrientation':
                case 'Orientation':
                case 'Reflect':
                case 'Probability':
                case 'If':
                    ruleString += tags[0];
                    break;

                case 'Set':
                case 'Firstset':
                    var modifiedTag = tags[0];
                    var index = modifiedTag.indexOf("\"");
                    while (index != -1) {
                        modifiedTag = modifiedTag.substring(0, index) + "\\" + modifiedTag.substring(index, modifiedTag.length);
                        var oldIndex = index;
                        index = modifiedTag.substring(index + 2, modifiedTag.length).indexOf("\"");
                        if (index != -1) index += 2 + oldIndex;
                    }

                    ruleString += "\"" + modifiedTag + "\"";
                    ruleString += ', ';

                    var modifiedTag = tags[2];
                    if (tags[1] == 'string') {
                        ruleString += "\"";
                        var index = modifiedTag.indexOf("\"");
                        while (index != -1) {
                            modifiedTag = modifiedTag.substring(0, index) + "\\" + modifiedTag.substring(index, modifiedTag.length);
                            var oldIndex = index;
                            index = modifiedTag.substring(index + 2, modifiedTag.length).indexOf("\"");
                            if (index != -1) index += 2 + oldIndex;
                        }
                    }

                    ruleString += modifiedTag;
                    if (tags[1] == 'string') ruleString += "\"";
                    break;

                default:
                    for (var j = 0; j < tags.length; j++) {
                        var modifiedTag = tags[j];
                        var index = modifiedTag.indexOf("\"");
                        while(index != -1) {
                            modifiedTag = modifiedTag.substring(0, index) + "\\" + modifiedTag.substring(index, modifiedTag.length);
                            var oldIndex = index;
                            index = modifiedTag.substring(index + 2, modifiedTag.length).indexOf("\"");
                            if (index != -1) index += 2 + oldIndex;
                        }
                        ruleString += "\"" + modifiedTag + "\"";
                        if (j != tags.length - 1) ruleString += ", ";
                    }
                    break;
            }
            ruleString += ")";
        }
        return ruleString;
    };

    // parse code and append postfixes to rule
    // rule ... rule desriptor to append the parsed postfixes to
    // code ... array of code elements containing postfixes
    // returns [rule, counter] ... rule with parsed postfixes and last position in code that was looked at
    self.parsePostfixes = function (rule, code) {
        var OUTSIDE = 1, INSIDE = 2, POINT = 3;

        if (!('postfixes' in rule)) {
            rule['postfixes'] = {};
        }

        var mode = OUTSIDE;
        var counter = 0;
        var postfixType, taglist = [];
        var waitingForTheEnd = false;
        while (counter < code.length) {
            switch (mode) {
                case OUTSIDE:
                    if (code[counter].Text == '.' && code[counter].RawKind == 8218) {   // start of postfix
                        mode = POINT;
                        waitingForTheEnd = false;
                    }
                    if (code[counter].Text == ';' && code[counter].RawKind == 8212) {   // full end of rule
                        return [rule, counter];
                    }
                    if (code[counter].Text == ',' && code[counter].RawKind == 8216) {   // end of rule in concat
                        return [rule, counter];
                    }
                    if (code[counter].Text == ')' && code[counter].RawKind == 8201) {   // end of rule in concat
                        if (waitingForTheEnd) return [rule, counter - 1];
                        waitingForTheEnd = true;
                    }

                    counter += 1;
                    break;
                    
                case POINT:
                    if (code[counter].RawKind == 8508 && self.postfixesPlain.get(code[counter].Text) != undefined) {
                        postfixType = code[counter].Text;
                        taglist = [];
                        mode = INSIDE;
                    }
                    counter += 1;
                    break;

                case INSIDE:
                    switch (postfixType) {

                        case 'Paint':
                            // first argument
                            if (code[counter].RawKind == 8508 &&
                                        code[counter + 1].Text == '.' && code[counter + 1].RawKind == 8218 &&
                                        code[counter + 2].RawKind == 8508) {
                                taglist.push(code[counter].Text + '.' + code[counter + 2].Text);
                                counter += 3;
                            // end of arguments
                            } else if (code[counter].Text == ')' && code[counter].RawKind == 8201) {
                                if (taglist.length != 0) rule['postfixes'][Object.keys(rule['postfixes']).length] = { type: postfixType, tags: taglist };
                                mode = OUTSIDE;
                                waitingForTheEnd = true;
                                counter += 1;
                            // second argument
                            } else if (code[counter].RawKind == 8509) {
                                taglist.push(code[counter].Text);
                                counter += 1;
                            } else {
                                counter += 1;
                            }
                            break;

                        case 'Asset':
                        case 'FirstOrientation':
                        case 'Orientation':
                        case 'Reflect':
                            // argument
                            if (code[counter].RawKind == 8508 &&
                                        code[counter + 1].Text == '.' && code[counter + 1].RawKind == 8218 &&
                                        code[counter + 2].RawKind == 8508) {
                                taglist.push(code[counter].Text + '.' + code[counter + 2].Text);
                                counter += 3;
                            // end of arguments
                            } else if (code[counter].Text == ')' && code[counter].RawKind == 8201) {
                                if (taglist.length != 0) rule['postfixes'][Object.keys(rule['postfixes']).length] = { type: postfixType, tags: taglist };
                                mode = OUTSIDE;
                                waitingForTheEnd = true;
                                counter += 1;
                            } else {
                                counter += 1;
                            }
                            break;

                        case 'Probability':
                            if (code[counter].Text == ')' && code[counter].RawKind == 8201) {
                                if (taglist.length != 0) rule['postfixes'][Object.keys(rule['postfixes']).length] = { type: postfixType, tags: taglist };
                                mode = OUTSIDE;
                                waitingForTheEnd = true;
                                counter += 1;
                            } else if (code[counter].RawKind == 8509) {
                                taglist.push(code[counter].Text);
                                counter += 1;
                            } else {
                                counter += 1;
                            }
                            break;

                        case 'Set':
                        case 'Firstset':
                            // end of arguments
                            if (code[counter].Text == ')' && code[counter].RawKind == 8201) {
                                if (taglist.length != 0) rule['postfixes'][Object.keys(rule['postfixes']).length] = { type: postfixType, tags: taglist };
                                mode = OUTSIDE;
                                waitingForTheEnd = true;
                                counter += 1;
                            // found number
                            } else if (code[counter].RawKind == 8509) {
                                if (code[counter].Text % 1 == 0) {
                                    taglist.push("int");
                                } else {
                                    taglist.push("double");
                                }
                                taglist.push(code[counter].Text);
                                counter += 1;
                            // found string
                            } else if (code[counter].RawKind == 8511) {
                                if (taglist.length == 1) {
                                        taglist.push("string");
                                }
                                taglist.push(code[counter].Text.substring(1, (code[counter].Text.length - 1)));
                                counter += 1;
                            // found true
                            } else if (code[counter].RawKind == 8323) {
                                taglist.push("bool");
                                taglist.push(code[counter].Text);
                                counter += 1;
                            // found false
                            } else if (code[counter].RawKind == 8324) {
                                taglist.push("bool");
                                taglist.push(code[counter].Text);
                                counter += 1;
                            } else {
                                counter += 1;
                            }
                            break;

                        default:
                            // end of list
                            if (code[counter].Text == ')' && code[counter].RawKind == 8201) {
                                if (taglist.length != 0) rule['postfixes'][Object.keys(rule['postfixes']).length] = { type: postfixType, tags: taglist };
                                mode = OUTSIDE;
                                waitingForTheEnd = true;
                                counter += 1;
                                // enum types
                            } else if (code[counter].RawKind == 8508 &&
                                        code[counter + 1].Text == '.' && code[counter + 1].RawKind == 8218 &&
                                        code[counter + 2].RawKind == 8508) {
                                taglist.push(code[counter].Text + '.' + code[counter + 2].Text);
                                counter += 3;
                                // other argument
                            } else if (code[counter].RawKind == 8511) {
                                taglist.push(code[counter].Text.substring(1, (code[counter].Text.length - 1)));
                                counter += 1;
                            } else {
                                counter += 1;
                            }
                            break;
                    }
                    
                    break;

                default:
                    counter += 1;
                    break;
            }
        }


        return [rule, counter];
    };

    return self;
}