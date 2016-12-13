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

    accordionFunction = function (target) {
        self.tags.forEach(function (value, key, map) {
            var id = key + "_content";
            var x = document.getElementById(id);
            if (id == target) {
                if (x.className.indexOf("w3-show") == -1) {
                    x.className += " w3-show";
                } else {
                    x.className = x.className.replace(" w3-show", "");
                }
                //           } else {
                //             if (x.className.indexOf("w3-show") != -1) {
                //               x.className = x.className.replace(" w3-show", "");
                //         }
            }
        });
    }

    // create full postfix ui as accordion
    self.addAllPostfixes = function (parentDiv, ruleDescriptor) {
        var postfixDiv = document.createElement('div');
        postfixDiv.id = "postfixDiv";

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
                var id = key + "_field";
                category.innerHTML += "<div style='position:relative;height:2em;'></div>";
                postfix = category.childNodes[postfix_counter];
                postfix_counter += 1;
                postfix.innerHTML = "<span class='tag-tag'>" + key + ": </span>";
                if (!isNaN(parseFloat(value)) && isFinite(value)) postfix.innerHTML += "<textarea id=" + id + "></textarea>";
                else {
                    postfix.innerHTML +=
                        "<div class='w3-container'>" +
                            "<div class='w3-dropdown-hover'>" +
                                "<button onclick='dropdownOpenFunction(\"" + key + "_dropdown\")' class='w3-btn-slim' style='height:1.8em;'>Hover Over Me!</button>" +
                                "<div class='w3-dropdown-content w3-border w3-hide' id=\"" + key + "_dropdown\" >" +
                                    "<a href='#'>Link 1</a>" +
                                    "<a href='#'>Link 2</a>" +
                                    "<a href='#'>Link 3</a>" +
                                "</div>" +
                            "</div>" +
                        "</div>";
                }
            })
            postfix_counter = 0;
        });

        parentDiv.appendChild(postfixDiv);

        //add functions
        self.postfixes.forEach(function (value, key, map) {
            value.forEach(function (value, key, map) {
                var id = "#" + key + "_field";
                // multiple tags possible
                if (value != 1) {
                    // editing rule
                    if (ruleDescriptor && key in ruleDescriptor) {
                        $(id).tagEditor({
                            delimiter: ";",
                            placeholder: "Enter tags ...",
                            clickDelete: true,
                            maxTags: value,
                            onChange: renderer.inputChanged,
                            initialTags: ruleDescriptor[key]
                        });
                        // new rule
                    } else {
                        // tag is 'fulfills'
                        if (key == "Fulfills") {
                            var goalTags = ruleController.getRule(renderer.selectedMesh.shape);
                            if (goalTags) goalTags = goalTags["Goal"];
                            // and there are goals
                            if (goalTags) {
                                $(id).tagEditor({
                                    delimiter: ";",
                                    placeholder: "Enter tags ...",
                                    clickDelete: true,
                                    maxTags: value,
                                    onChange: renderer.inputChanged,
                                    initialTags: goalTags
                                });
                                // and there are no goals
                            } else {
                                $(id).tagEditor({
                                    delimiter: ";",
                                    placeholder: "Enter tags ...",
                                    clickDelete: true,
                                    maxTags: value,
                                    onChange: renderer.inputChanged
                                });
                            }
                        }
                            // tag is not 'fulfills'
                        else {
                            $(id).tagEditor({
                                delimiter: ";",
                                placeholder: "Enter tags ...",
                                clickDelete: true,
                                maxTags: value,
                                onChange: renderer.inputChanged
                            });
                        }
                    }
                    // only one tag possible
                } else {
                    // editing rule
                    if (ruleDescriptor && key in ruleDescriptor) {
                        $(id).tagEditor({
                            delimiter: ";",
                            placeholder: "Enter tag ...",
                            clickDelete: true,
                            maxTags: value,
                            onChange: renderer.inputChanged,
                            initialTags: ruleDescriptor[key]
                        });
                        // new rule
                    } else {
                        $(id).tagEditor({
                            delimiter: ";",
                            placeholder: "Enter tag ...",
                            clickDelete: true,
                            maxTags: value,
                            onChange: renderer.inputChanged
                        });
                    }
                }
            })
        });
    }

    // add postfixes in parentDiv to ruleDescriptor
    self.applyPostfixes = function (parentDiv, ruleDescriptor) {
        self.postfixes.forEach(function (value, key, map) {
            value.forEach(function (value, key, map) {
                var id = "#" + key + "_field";
                var taglist = $(id).tagEditor('getTags')[0].tags;
                ruleDescriptor[key] = taglist;
            });
        });
    }

    // append postfix string representation in rule to ruleString
    self.appendPostfixString = function (rule, ruleString) {
        postfixes.forEach(function (value, key, map) {
            value.forEach(function (value, key, map) {
                var tagList = rule[key];
                if (tagList.length != 0) {
                    ruleString += "\n\t." + key + "(";
                    for (var i = 0; i < tagList.length; i++) {
                        ruleString += "\"" + tagList[i] + "\"";
                        if (i != tagList.length - 1) ruleString += ", ";
                    }
                    ruleString += ")";
                }
            });
        });
        return ruleString;
    }

    return self;
}