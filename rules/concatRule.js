var concatRule = {
    type: 'Concat',
    mode: false,
    options: []
};

generateConcatRule = function () {
    var concat = generateCustomRule(concatRule);
    concat.selections = [];
    concat.fieldIds = [];
    concat.generateRuleString = function () {
        var output = "new Rules.Concat(";
        for (var i = 0; i < this.selections.length; i++) {
            output += "\n";
            output += this.selections[i].generateRuleString();
            output = output.slice(0, -1);
            output += ",";
        }
        output = output.slice(0, -1);
        output += "\n);";

        this.lastRuleString = output;

        return output;
    };
    concat.generateShortString = function () {

        for (var idx in this.postfixes) {
            if (this.postfixes[idx].type == "Name") {
                return '"' + this.postfixes[idx].tags[0] + '"';
            }
        }

        var output = "Concat of ";
        output += this.selections.length;
        output += " rules";
        return output;
    };
    concat.applyRule = function (shape) {
        for (var i = 0; i < this.selections.length; i++) {
            this.selections[i].applyRule(shape);
            this.selections[i].inConcat = true;
        }
    };
    concat.unapplyRule = function (shape) {
        for (var i = this.selections.length - 1; i >= 0; i--) {
            this.selections[i].unapplyRule(shape);
        }
    };
    concat.appendInputFields = function (parentDiv, empty) {
        if (!this.selections) {
            this.selections = [];
        }

        while (parentDiv.hasChildNodes()) {
            parentDiv.removeChild(parentDiv.lastChild);
        }

        // list current selection
        var selectionListDiv = document.createElement('div');
        selectionListDiv.id = "concatRuleSelectionDiv";
        selectionListDiv.classList = "w3-container";
        selectionListDiv.style = "position:relative; border-bottom: 1px solid black;";

        for (var i = 0; i < this.selections.length; i++) {
            var ruleDiv = document.createElement('div');
            ruleDiv.style = "height:2em;position:relative;";
            selectionListDiv.appendChild(ruleDiv);
            ruleDiv.innerHTML = "<span class='tag-tag'>" + this.selections[i].generateShortString() + "</span>";

            if (i != 0 &&
                !this.selections[i].generatesMultipleShapes) {
                var up_button = document.createElement("button");
                up_button.id = "up_Button_" + i;
                up_button.classList = "w3-btn";
                up_button.style = "height:2em;float:right;padding:3px 16px;"
                var up_button_text = document.createTextNode("up");

                up_button.appendChild(up_button_text);
                ruleDiv.appendChild(up_button);
            }

            if (i != this.selections.length - 1 &&
                !this.selections[i + 1].generatesMultipleShapes) {
                var down_button = document.createElement("button");
                down_button.id = "down_Button_" + i;
                down_button.classList = "w3-btn";
                down_button.style = "height:2em;float:right;padding:3px 16px;"
                var down_button_text = document.createTextNode("down");

                down_button.appendChild(down_button_text);
                ruleDiv.appendChild(down_button);
            }

            var remove_button = document.createElement("button");
            remove_button.id = "removeRule_Button_" + i;
            remove_button.classList = "w3-btn";
            remove_button.style = "height:2em;float:right;padding:3px 16px;"
            var remove_button_text = document.createTextNode("remove");

            remove_button.appendChild(remove_button_text);
            ruleDiv.appendChild(remove_button);
        }

        parentDiv.appendChild(selectionListDiv);

        // up button function
        for (var i = 0; i < this.selections.length; i++) {
            $("#up_Button_" + i).click(function (i) {
                return function () {
                    var tmp = concat.selections[i];
                    concat.selections[i] = concat.selections[i - 1];
                    concat.selections[i - 1] = tmp;

                    concat.inputChanged();
                    concat.appendInputFields(parentDiv, rule, true);
                };
            }(i))
        }

        // down button function
        for (var i = 0; i < this.selections.length; i++) {
            $("#down_Button_" + i).click(function (i) {
                return function () {
                    var tmp = concat.selections[i];
                    concat.selections[i] = concat.selections[i + 1];
                    concat.selections[i + 1] = tmp;

                    concat.inputChanged();
                    concat.appendInputFields(parentDiv, rule, true);
                };
            }(i))
        }

        // remove button function
        for (var i = 0; i < this.selections.length; i++) {
            $("#removeRule_Button_" + i).click(function (i) {
                return function () {
                    rules[concat.selections[i].index].inConcat = false;
                    concat.selections.splice(i, 1);

                    concat.inputChanged();
                    concat.appendInputFields(parentDiv, rule, true);
                };
            }(i))
        }

        // list available rules
        var ruleListDiv = document.createElement('div');
        ruleListDiv.id = "concatRuleListDiv";
        ruleListDiv.classList = "w3-container";
        ruleListDiv.style = "position:relative;";

        var lastAdded = null;
        var rules = getRuleController().getRules();
        for (var i = 0; i < rules.length; i++) {
            if (rules[i] != concat &&
                !(lastAdded && lastAdded.generatesMultipleShapes)) {

                var ruleDiv = document.createElement('div');
                ruleDiv.style = "height:2em;position:relative;";
                ruleListDiv.appendChild(ruleDiv);
                ruleDiv.innerHTML = "<span class='tag-tag'>" + rules[i].generateShortString() + "</span>";

                var add_button = document.createElement("button");
                add_button.id = "addRule_Button_" + i;
                add_button.classList = "w3-btn";
                add_button.style = "height:2em;float:right;padding:3px 16px;"
                var add_button_text = document.createTextNode("add");

                lastAdded = rules[i];

                add_button.appendChild(add_button_text);
                ruleDiv.appendChild(add_button);
            }
        }
        parentDiv.appendChild(ruleListDiv);

        // add buttons functions
        for (var i = 0; i < rules.length; i++) {
            $("#addRule_Button_" + i).click(function (i) {
                return function () {
                    rules[i].index = i;
                    concat.selections.push(rules[i]);
                    rules[i].inConcat = true;
                    concat.inputChanged();

                    concat.appendInputFields(parentDiv, rule, true);
                };
            }(i))
        }
    };
    concat.parseCode = function (ruleBuffer) {
        this.selections = [];

        var counter = 0;
        while (ruleBuffer[counter].Text != "Concat") {
            if (counter < ruleBuffer.length) {
                counter += 1;
            } else {
                rule = {type: 'concatRuleNotFound'};
                return -1;
            }
        }
        counter += 2;

        var lastPosition = 0;
        var ruleStart = 0;
        while (counter < ruleBuffer.length) {
            if (ruleBuffer[counter].Text == 'new' && ruleBuffer[counter].RawKind == 8354) {
                ruleStart = ruleBuffer[counter].SpanStart;
                counter += 2;
            } else if (ruleBuffer[counter].RawKind == 8508 && ruleBuffer[counter].Text == "Rules") {
                counter += 2;
                var rule = getRuleController().createRule(ruleBuffer[counter].Text);
                lastPosition = rule.parseCode(ruleBuffer.slice(counter));
                counter += lastPosition;
                [rule, lastPosition] = renderer.postfixController.parsePostfixes(rule, ruleBuffer.slice(counter));
                counter += lastPosition;
                rule.start = ruleStart;
                if (counter < ruleBuffer.length)
                    rule.end = ruleBuffer[counter].SpanStart + ruleBuffer[counter].SpanLength;
                else lastPosition = 0;  // if failed, dont jump over rest of rules
                rule.deleted = false;
                rule.edited = false;
                rule.wasParsed = true;
                rule.inConcat = true;
                this.selections.push(rule);
            } else {
                counter += 1;
            }
        }

        return lastPosition + 2;
    };
    concat.inputChanged = function() {
        this.generatesMultipleShapes = this.selections[this.selections.length - 1].generatesMultipleShapes;
        inputChanged();
    };
    return concat;
};

getRuleController().addRuleFactory(concatRule.type, generateConcatRule);