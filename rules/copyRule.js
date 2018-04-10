var copyConfig = {
    type: 'Copy',
    mode: false,
    options: []
};

generatecopyRule = function () {
    var copy = generateCustomRule(copyConfig);

    copy.childShapes = [];

    copy.parts = [];

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
            partDiv.id = 'partDiv' + this.draggingHelpers.nextIndex;
            var partname = 'part' + this.draggingHelpers.nextIndex + '_mode_selector';
            var innerHTML = '<select id=' + partname + '>';
            innerHTML += '<option value="Relative">Relative</option>';
            innerHTML += '<option value="Absolute">Absolute</option>';
            innerHTML += '</select>';
            partDiv.innerHTML += innerHTML;
            var amount_input = document.createElement("input");
            amount_input.setAttribute('type', 'text');
            var inputname = 'part' + this.draggingHelpers.nextIndex + '_amount_input_field';
            amount_input.setAttribute('id', inputname);
            partDiv.appendChild(amount_input);

            var addPostfixName = 'part' + this.draggingHelpers.nextIndex + '_add_postfix_button';
            var addPostfixButton = document.createElement('button');
            addPostfixButton.id = addPostfixName;
            addPostfixButton.style = 'margin:0px 20px';
            var addPostfixButtonText = document.createTextNode('add Postfix');
            addPostfixButton.appendChild(addPostfixButtonText);
            partDiv.appendChild(addPostfixButton);

            var removename = 'part' + this.draggingHelpers.nextIndex + '_remove_button';
            var removeButton = document.createElement('button');
            removeButton.id = removename;
            removeButton.style = 'position:absolute;right:5px';
            var removeButtonText = document.createTextNode('X');
            removeButton.appendChild(removeButtonText);
            partDiv.appendChild(removeButton);

            button.parentNode.insertBefore(partDiv, button);
            $('#' + partname).change(inputChanged);
            $('#' + inputname).change(inputChanged);
            $('#' + addPostfixName).click(this.addPostfixFunction(partDiv.id, settings))
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
                    this.addPostfix(partDiv.id, settings.postfixes[i]);
                }
            } else {
                amount_input.value = 1;
            }

            this.draggingHelpers.nextIndex++;
            if (!settings && doUpdate) inputChanged();
        };
        copy.addPostfixFunction = function (partId, settings) {
            return function () {
                this.addPostfix(partId, settings);
            }
        };
        copy.addPostfix = function (partId, settings) {
            part = document.getElementById(partId);
            var possiblePostfixes = ["Goal", "goal", "Tag", "Attribute", "Asset", "Paint", "Orientation", "Reflect", "Void", "Family", "Sync"];
            renderer.postfixController.addPostfix(part, settings, possiblePostfixes, deleteButton = true);
        }
    }
    // standard functions
    copy.generateRuleString = function () {
        var ruleString = "new Rules.Copy(" + this.axis + ",";
        var counter = 1;
        for (var part in this.parts) {
            ruleString += "\n\t\t" + this.parts[part].mode + "(" + this.parts[part].amount + ")";
            ruleString = addTags(this.parts[part], ruleString, 3);
            if (counter < Object.keys(this.parts).length) ruleString += ',';
            counter++;
        }
        ruleString += "\n)";
        ruleString = addTags(copy, ruleString);
        ruleString += ";";

        this.lastRuleString = ruleString;

        return ruleString;
    };
    copy.generateShortString = function () {

        for (var idx in this.postfixes) {
            if (this.postfixes[idx].type == "Name") {
                return '"' + this.postfixes[idx].tags[0] + '"';
            }
        }

        var keys = Object.keys(this.parts);
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
            this.addPart(true);
        });

        if (!empty) {
            for (var i = 0; i < Object.keys(this.parts).length; i++) {
                this.addPart(true, this.parts[Object.keys(this.parts)[i]]);
            }
        } else {
            this.addPart(false);
            this.addPart(false);
        }
    };
    copy.applyRule = function (shape) {
        // create childShapes
        if (this.childShapes.length != Object.keys(this.parts).length) {
            while (this.childShapes.length > Object.keys(this.parts).length) {
                getPreviewController().forgetShape(this.childShapes.pop());
            }
            while (this.childShapes.length < Object.keys(this.parts).length) {
                var newChild = jQuery.extend(true, {}, shape);
                newChild.previewID = null;
                getPreviewController().storeShape(newChild);
                this.childShapes.push(newChild);
            }
        }
        shape.childShapes = this.childShapes;

        for (var i = 0; i < this.childShapes.length; i++) {
            if (!this.childShapes[i].previewID)
                getPreviewController().storeShape(this.childShapes[i]);
        }
    };
    copy.unapplyRule = function (shape) {
        for (var i = 0; i < this.childShapes.length; i++) {
            getPreviewController().forgetShape(this.childShapes[i]);
        }
        shape.childShapes = [];
    };
    copy.updateRule = function () {
        this.parts = [];

        for (var i = 0; i < this.draggingHelpers.nextIndex; i++) {
            var name = 'part' + i + '_mode_selector';
            var modeSelector = document.getElementById(name);
            if (modeSelector) {
                var amountInput = document.getElementById('part' + i + '_amount_input_field');
                var mode = modeSelector.options[modeSelector.selectedIndex].value;
                var amount = amountInput.value;
                this.parts['part' + i] = { mode: mode, amount: amount };

                var partId = 'partDiv' + i;
                var part = document.getElementById(partId)
                readTags(part, this.parts['part' + i]);
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

        this.parts = [];
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
                        this.parts['part' + partCounter] = part;
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

getRuleController().addRuleFactory(copyConfig.type, generatecopyRule);