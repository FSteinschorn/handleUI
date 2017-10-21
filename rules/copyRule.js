var copyConfig = {
    type: 'Copy',
    mode: false,
    options: []
};

generatecopyRule = function () {
    var copy = generateCustomRule(copyConfig);
    // helpers
    {
        copy.draggingHelpers = {
            nextIndex: 0,
            epsilon: 0.001
        };

        copy.generatesMultipleShapes = true;

        copy.addPart = function (doUpdate, settings) {
            var button = document.getElementById("addPartButton");
            var partDiv = document.createElement('div');
            partDiv.style = 'margin:0.01em 16px';
            partDiv.id = 'partDiv' + copy.draggingHelpers.nextIndex;
            var partname = 'part' + copy.draggingHelpers.nextIndex + '_mode_selector';
            var innerHTML = '<select id=' + partname + '>';
            innerHTML += '<option value="Relative">Relative</option>';
            innerHTML += '<option value="Absolute">Absolute</option>';
            innerHTML += '</select>';
            partDiv.innerHTML += innerHTML;
            var amount_input = document.createElement("input");
            amount_input.setAttribute('type', 'text');
            var inputname = 'part' + copy.draggingHelpers.nextIndex + '_amount_input_field';
            amount_input.setAttribute('id', inputname);
            partDiv.appendChild(amount_input);

            var addPostfixName = 'part' + copy.draggingHelpers.nextIndex + '_add_postfix_button';
            var addPostfixButton = document.createElement('button');
            addPostfixButton.id = addPostfixName;
            addPostfixButton.style = 'margin:0px 20px';
            var addPostfixButtonText = document.createTextNode('add Postfix');
            addPostfixButton.appendChild(addPostfixButtonText);
            partDiv.appendChild(addPostfixButton);

            var removename = 'part' + copy.draggingHelpers.nextIndex + '_remove_button';
            var removeButton = document.createElement('button');
            removeButton.id = removename;
            removeButton.style = 'position:absolute;right:5px';
            var removeButtonText = document.createTextNode('X');
            removeButton.appendChild(removeButtonText);
            partDiv.appendChild(removeButton);

            button.parentNode.insertBefore(partDiv, button);
            $('#' + partname).change(inputChanged);
            $('#' + inputname).change(inputChanged);
            $('#' + addPostfixName).click(copy.addPostfixFunction(partDiv.id, settings))
            $('#' + removename).click(function (id) {
                return function () {
                    var part = document.getElementById(id);
                    button.parentNode.removeChild(part);
                    inputChanged();
                }
            }(partDiv.id));

            if (settings) {
                var selector = document.getElementById(partname);
                for (var i = 0; i < 2; i++) {
                    if (selector.options[i].label == settings.mode) selector.selectedIndex = i;
                }
                amount_input.value = settings.amount;
                for (var i = 0; i < Object.keys(settings.postfixes).length; i++) {
                    copy.addPostfix(partDiv.id, settings.postfixes[i]);
                }
            } else {
                amount_input.value = 1;
            }

            this.draggingHelpers.nextIndex++;
            if (!settings && doUpdate) inputChanged();
        };

        copy.addPostfixFunction = function (partId, settings) {
            return function () {
                copy.addPostfix(partId, settings);
            }
        };
        copy.addPostfix = function (partId, settings) {
            part = document.getElementById(partId);
            var possiblePostfixes = ["Goal", "goal", "Tag", "Attribute", "Asset", "Paint", "Orientation", "Reflect", "Void", "Family", "Sync"];
            renderer.postfixController.addPostfix(part, settings, possiblePostfixes, deleteButton = true);
        }
    }
    // standard functions
    copy.type = 'Copy';
    copy.generateRuleString = function () {
        var ruleString = "new Rules.copy(" + copy.axis + ",";
        var counter = 1;
        for (var part in copy.parts) {
            ruleString += "\n\t\t" + copy.parts[part].mode + "(" + copy.parts[part].amount + ")";
            ruleString = addTags(copy.parts[part], ruleString, 3);
            if (counter < Object.keys(copy.parts).length) ruleString += ',';
            counter++;
        }
        ruleString += "\n)";
        ruleString = addTags(copy, ruleString);
        ruleString += ";";

        copy.lastRuleString = ruleString;

        return ruleString;
    };
    copy.generateShortString = function () {
        var keys = Object.keys(copy.parts);
        var size = keys.length;
        return ("copy by " + size + " parts.");
    };
    copy.appendInputFields = function (parentDiv, empty) {
        var addPartButton = document.createElement('button');
        addPartButton.id = "addPartButton";
        addPartButton.style.marginLeft = "1em";
        var addPartButton_text = document.createTextNode("add Part");
        addPartButton.appendChild(addPartButton_text);
        parentDiv.appendChild(addPartButton);

        $("#addPartButton").click(function () {
            copy.addPart(true);
        });

        if (!empty) {
            for (var i = 0; i < Object.keys(copy.parts).length; i++) {
                copy.addPart(true, copy.parts[Object.keys(copy.parts)[i]]);
            }
        } else {
            copy.addPart(false);
            copy.addPart(false);
        }
    };
    copy.updateRule = function () {
        copy.parts = [];

        for (var i = 0; i < copy.draggingHelpers.nextIndex; i++) {
            var name = 'part' + i + '_mode_selector';
            var modeSelector = document.getElementById(name);
            if (modeSelector) {
                var amountInput = document.getElementById('part' + i + '_amount_input_field');
                var mode = modeSelector.options[modeSelector.selectedIndex].value;
                var amount = amountInput.value;
                copy.parts['part' + i] = { mode: mode, amount: amount };

                var partId = 'partDiv' + i;
                var part = document.getElementById(partId)
                readTags(part, copy.parts['part' + i]);
            }
        }
    };
    copy.parseCode = function(ruleBuffer) {
        var endOfRule = ruleBuffer.length;
        var counter = 0;
        var depth = 0;
        while (counter < ruleBuffer.length) {
            var current = ruleBuffer[counter];
            if (current.RawKind == 8200 && current.Text == '(') depth += 1;
            if (current.RawKind == 8201 && current.Text == ')') {
                depth -= 1;
                if (depth == 0) {
                    endOfRule = counter;
                    break;
                }
            }
            counter += 1;
        }

        copy.parts = [];
        var partCounter = 0;

        var DEFAULT = 0, PART = 1;
        var parseMode = DEFAULT;

        var mode, amount;

        counter = 0;
        while (counter < ruleBuffer.length) {
            current = ruleBuffer[counter]
            switch(parseMode) {
                case DEFAULT:
                    if (current.RawKind == 8508) {
                        if (current.Text == "Relative") {
                            parseMode = PART;
                            mode = "Relative";
                        } else if (current.Text == "Absolute") {
                            parseMode = PART;
                            mode = "Absolute";
                        }
                    }
                    break;
                case PART:
                    if (current.RawKind == 8509 ||
                        current.RawKind == 8511 ||
                        current.RawKind == 8323) {
                        part = { mode: mode, amount: current.Text };
                        [part, used] = renderer.postfixController.parsePostfixes(part, ruleBuffer.slice(counter, endOfRule));
                        if (!part.postfixes) part.postfixes = [];
                        counter += used;
                        copy.parts['part' + partCounter] = part;
                        partCounter += 1;
                        parseMode = DEFAULT;
                    }
                    break;
                case POSTFIX:
                    break;
                default:
                    break;
            }
            counter += 1;
        }

        return endOfRule;
    };
    return copy;
};

getRuleController().rules.set(copyConfig.type, generatecopyRule);