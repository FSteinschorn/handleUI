function PostfixController() {
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

    self.addAllPostfixes = function (parentDiv, ruleDescriptor) {
        var tagDiv = document.createElement('div');
        tagDiv.id = "tagDiv";

        tagDiv.innerHTML = "<div class='w3-accordion w3-light-grey'></div>";
        accordion = tagDiv.childNodes[0];
        category_counter = 1;
        tag_counter = 0;
        self.tags.forEach(function (value, key, map) {
            var id = key + "_content";
            accordion.innerHTML += "<button onclick='accordionFunction(\"" + id + "\")' class='w3-btn-block w3-left-align'>" + key + "</button><div id='" + id + "' class='w3-accordion-content w3-container'></div>";
            category = accordion.childNodes[category_counter];
            category_counter += 2;
            value.forEach(function (value, key, map) {
                var id = key + "_field";
                category.innerHTML += "<div style='position:relative;height:2em;'></div>";
                tag = category.childNodes[tag_counter];
                tag_counter += 1;
                tag.innerHTML = "<span class='tag-tag'>" + key + ": </span>";
                if (!isNaN(parseFloat(value)) && isFinite(value)) tag.innerHTML += "<textarea id=" + id + "></textarea>";
                else {
                    tag.innerHTML +=
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
            tag_counter = 0;
        });

        parentDiv.appendChild(tagDiv);
    }

    return self;
}