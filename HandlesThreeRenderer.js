﻿
// ace editor helper
function charToRowCol(position) {
    var editor = ace.edit("code_text_ace");
    var session = editor.getSession();
    var lines = session.getLines(0, session.getLength());
    var counter = 0, line = 0;
    while (counter < position) {
        counter += lines[line].length + 1;
        line += 1;
    }
    line -= 1;
    counter -= lines[line].length + 1;
    return {row: line, column: position - counter};
}

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 40; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function HandlesThreeRenderer(domQuery) {
    var self = new InteractiveThreeRenderer(domQuery, true);

    self.selectedMesh = null;
    self.selectedRule = null;
    self.handlesScene = null;

    creatingNewRule = false;

    uneditedRule = null;
    uneditedCode = null;
    currentRuleWasParsed = false;
    self.ruleIndex = 0;

    handlesType = null;
    handleId = 0;
    overHandle = false;
    dragging = false;

    self.postfixController = new PostfixController(self);
    self.ruleController = getRuleController(self);

    //create div container
    {
        var scrollDiv = document.createElement('div');
        scrollDiv.ui = "scrollDiv";
        scrollDiv.style.width = "100%";
        scrollDiv.style.height = "100%";
        var uiDiv = document.createElement('div');
        uiDiv.id = "uiDiv";
        uiDiv.style.position = "absolute";
        uiDiv.style.bottom = "0px";
        uiDiv.style.width = "100%";
        uiDiv.style.overflowY = "auto";
        uiDiv.style.overflowX = "hidden";
        uiDiv.style.maxHeight = "100%";
        uiDiv.classList = "w3-light-grey";
        scrollDiv.appendChild(uiDiv);
        uiDiv.innerHTML = "<p><br>&emsp;Press <button type=\"button\" class=\"btn btn-primary flexStatic\" id=\"parse-button\">Go</button> to start editing rules!</p>";
        document.getElementById("graphRendererContainer").appendChild(scrollDiv);
    }

    self.codeParseNeeded = true;

    self.parseCode = function () {
        if (lastGrammarResponse.parsedJSON == "") {
            self.initButtonsUI();
            return;
        }
        var parsedCode = JSON.parse(lastGrammarResponse.parsedJSON);
        var parsedRules = [];

        var counter = 0;
        var ruleBuffer = [];
        var expectedRulesStart = null;
        var current = null;
        var depth = 0;
        var ruleStart = null;
        var keepStart = false;
        for (var counter = 0; counter < parsedCode.length; counter++) {
            current = parsedCode[counter];
            if (current.Text == 'new' && current.RawKind == 8354) {
                expectedRulesStart = current.SpanStart + current.SpanLength + 1;
                if (!keepStart) ruleStart = current.SpanStart;
            } else if (current.Text == 'Rules' && current.RawKind == 8508 && current.SpanStart == expectedRulesStart) {
                depth += 1;
            } else if (current.Text == 'Concat' && current.RawKind == 8508) {
                keepStart = true;
            } else if (current.Text == ';' && current.RawKind == 8212 && depth > 0) {
                [rule, postfixStart] = self.ruleController.parseRule(ruleBuffer);
                self.postfixController.parsePostfixes(rule, ruleBuffer.slice(postfixStart));
                rule.start = ruleStart;
                rule.end = current.SpanStart + current.SpanLength;
                rule.deleted = false;
                rule.edited = false;
                rule.wasParsed = true;
                parsedRules.push(rule);
                ruleBuffer = [];
                depth = 0;
                keepStart = false;
            }

            if (depth != 0) {
                ruleBuffer.push(current);
            }
        }

        self.ruleController.setParsedRules(parsedRules);

        clearUI();
        self.initButtonsUI();
    };

    self.wireframeHitCallback = function (intersects) {
        var seek = true;
        for (var i = 0; (i < intersects.length) && seek; ++i) {
            var pick = intersects[i].object;
            if (intersects[i].distance > self.closestIntersection) {
                seek = false;
            }
            else if (pick != self.picked) {
                if (self.Seeds.hasOwnProperty(pick.mName)) {
                    var seedid = self.Seeds[pick.mName];
                    var shape = SeedWidgets.GetById(seedid).GetShape(pick.mName);
                    if (shape.interaction.visible()) {
                        if (self.picked) {
                            var shapeID = self.picked.mName;
                            var seedID = self.Seeds[shapeID];
                            var seed = SeedWidgets.GetById(seedID);
                            var pickedshape = seed.GetShape(shapeID);
                            pickedshape.interaction.picked(false);
                        }
                        self.picked = pick;
                        shape.interaction.picked(true);
                        seek = false;
                    }
                }
            }
            else
                seek = false;
        }
    };
    self.wireframeClearCallback = function () {};
    self.lineHitCallback = function (intersects) {
        overHandle = true;
        handleId = intersects[0].object.id;
        self.intersection = intersects[0].point;
        self.selectedRule.onMouseOverHandle(handleId);
    };
    self.lineClearCallback = function () {
        overHandle = false;
        self.intersection = null;
        self.selectedRule.onMouseNotOverHandle();
    };

    self.initCalls.push(function () {
        document.addEventListener('click', this.onDocumentMouseClick, false);
        document.addEventListener('keydown', this.onDocumentKeyDown, false);
        document.addEventListener('mousedown', this.onDocumentMouseDown, false);
        document.addEventListener('mouseup', this.onDocumentMouseUp, false);

        self.handlesScene = new THREE.Scene();

        ace.edit("code_text_ace").$blockScrolling = Infinity;

        var goButton = document.getElementById("parse-button");
        goButton.addEventListener("click", function () {
            clearUI();
            self.selectedMesh = null;
            self.selectedRule = null;
            self.codeParseNeeded = true;
        }, false);
    });
    self.updateCalls.push(function () {
        self.raycastScene(self.ruleController.previewScene.children, false, self.wireframeHitCallback, self.wireframeClearCallback);
        self.raycastScene(self.handlesScene.children, true, self.lineHitCallback, self.lineClearCallback);
    });
    self.renderCalls.push(function () {
        this.renderer.render(self.ruleController.previewScene, this.camera);

        this.renderer.context.disable(this.renderer.context.DEPTH_TEST);
        this.renderer.render(self.handlesScene, this.camera);
        this.renderer.context.enable(this.renderer.context.DEPTH_TEST);

        if (self.codeParseNeeded == true && (typeof lastGrammarResponse != 'undefined') && lastGrammarResponse != null) {
            self.codeParseNeeded = false;
            self.parseCode();
        }
    });

    self.onDocumentMouseDown = function onDocumentMouseClick(event) {
        if (overHandle) {
            self.selectedRule.onHandlePressed(handleId, self.mouse, self.intersection, self.handlesScene, self.camera, self.selectedMesh.shape);
            dragging = true;
            self.controls.enabled = false;
        } else if (self.picked) {
            var node = self.resolveNode(self.picked);
            if (self.selectedMesh == node) return;

            if (self.selectedMesh) {
                // remove old selection and ui
                self.selectedMesh.shape.interaction.selected(false);
                if (self.selectedMesh.shape.appliedRules == 0) self.ruleController.removePreview(self.selectedMesh.shape);
                else self.ruleController.changePreviewColor(self.selectedMesh.shape, "blue", self.selectedRule);
                self.selectedMesh = null;
                for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
                    self.handlesScene.remove(self.handlesScene.children[i]);
            }

            // create new selection and ui
            node.shape.interaction.selected(true);
            self.selectedMesh = node;
            if (!self.selectedMesh.shape.appliedRules) self.selectedMesh.shape.appliedRules = 0;
            if (self.selectedMesh.shape.appliedRules == 0) self.ruleController.addPreview(self.selectedMesh.shape, "green");
            else self.ruleController.changePreviewColor(self.selectedMesh.shape, "green", self.selectedRule);

            clearUI();
            self.initButtonsUI();
            self.RenderSingleFrame();
        }
    };
    self.onDocumentMouseMove = function onDocumentMouseMove(event) {
        var offset = self.container.offset();
        var cullLeft = event.clientX < offset.left;
        var cullRight = event.clientX > offset.left + self.container.innerWidth();

        var cullTop = event.clientY < offset.top;
        var cullBottom = event.clientY > offset.top + self.container.innerHeight();

        //Update the mouse position, a transformation from screen to normalized device coordinates is necessary; notice the flipped y
        if (cullLeft || cullRight || cullTop || cullBottom)
            self.mouse.inside = false;
        else {
            self.mouse.x = ((event.clientX - self.container.offset().left) / self.container.innerWidth()) * 2 - 1;
            self.mouse.y = -((event.clientY - self.container.offset().top) / self.container.innerHeight()) * 2 + 1;
            self.mouse.inside = true;
            if (dragging && (handlesType != null)) self.selectedRule.onHandleDragged(self.mouse);
        }
        self.Update();
    };
    self.onDocumentMouseUp = function (event) {
        if (dragging) {
            self.selectedRule.onHandleReleased();
            dragging = false;
        }
        self.controls.enabled = true;
        self.Update();
        self.RenderSingleFrame();
    };
    self.onDocumentKeyDown = function onDocumentKeyDown(event) {
        switch(event.keyCode) {
            case 27:    // ESC
                if (self.selectedMesh) {
                    self.selectedMesh.shape.interaction.selected(false);
                    if (self.selectedMesh.shape.appliedRules == 0) self.ruleController.removePreview(self.selectedMesh.shape);
                    else self.ruleController.changePreviewColor(self.selectedMesh.shape, "blue");
                    self.selectedMesh = null;
                    for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
                        self.handlesScene.remove(self.handlesScene.children[i]);

                    clearUI();
                    self.initButtonsUI();

                    self.Update();
                    self.RenderSingleFrame();
                }
                break;
            default:
                break;
        }
    };

    // highlighting rules in the list
    {
        var currently_marked;
        var updateRuleHightlightFromCode = function () {
            if (!document.getElementById("ruleListDiv")) return;
            var editor = ace.edit("code_text_ace");
            var current_position = editor.session.doc.positionToIndex(editor.getCursorPosition());
            var div_id;
            for (var index in self.ruleController.getParsedRules()) {
                var rule = self.ruleController.getParsedRules()[index];
                if (rule.deleted) return;
                if (rule.start <= current_position && current_position <= rule.end) {
                    div_id = "parsed_" + index + "_div";
                    break;
                }
            }
            if (!div_id) for (var index in self.ruleController.getAllTmpRules()) {
                var rule = self.ruleController.getAllTmpRules()[index];
                if (rule.deleted) return;
                if (rule.start <= current_position && current_position <= rule.end) {
                    div_id = "tmp_" + index + "_div";
                    break;
                }
            }
            if (div_id) {
                var new_div = document.getElementById(div_id);
                new_div.style.backgroundColor = "#c2c8eb";
                if (currently_marked && currently_marked != div_id) {
                    var old_div = document.getElementById(currently_marked);
                    old_div.style.backgroundColor = "";
                }
                currently_marked = div_id;
            } else if (currently_marked) {
                var old_div = document.getElementById(currently_marked);
                old_div.style.backgroundColor = "";
            }
        };
        var updateRuleHighlightFromRule = function(rule, i) {
            return function() {
                if (rule.deleted) return;
                var editor = ace.edit("code_text_ace");
                var selection = editor.getSelection();
                var start = charToRowCol(rule.start);
                var end = charToRowCol(rule.end);
                selection.clearSelection();
                selection.moveCursorToPosition(start);
                selection.selectToPosition(end);
                if (!document.getElementById("ruleListDiv")) return;
                if (rule.wasParsed) {
                    var div_id = "parsed_" + i + "_div";
                } else {
                    var div_id = "tmp_" + i + "_div";
                }
                var new_div = document.getElementById(div_id);
                new_div.style.backgroundColor = "#c2c8eb";
                if (currently_marked && currently_marked != div_id) {
                    var old_div = document.getElementById(currently_marked);
                    old_div.style.backgroundColor = "";
                }
                currently_marked = div_id;
            }
        };
        var editor_div = document.getElementById("code_text_ace");
        editor_div.onclick = updateRuleHightlightFromCode;
        var editor = ace.edit("code_text_ace");
        var selection = editor.getSelection();
        selection.on("changeCursor", updateRuleHightlightFromCode);
    }

    self.initButtonsUI = function () {
        var ruleListDiv = document.createElement('div');
        ruleListDiv.id = "ruleListDiv";
        ruleListDiv.classList = "w3-container";
        ruleListDiv.style = "position:relative;";

        var parsedRules = self.ruleController.getParsedRules();
        for (var i in parsedRules) {
            if (!parsedRules[i].deleted && !parsedRules[i].inConcat) {
                var ruleDiv = document.createElement('div');
                ruleDiv.style = "height:2em;position:relative;padding-left:16px";
                ruleDiv.id = "parsed_" + i + "_div";
                ruleListDiv.appendChild(ruleDiv);
                ruleDiv.innerHTML = "<span class='tag-tag'>" + self.ruleController.generateShortString(parsedRules[i]) + "</span>";

                if (self.selectedMesh) {
                    var edit_button = document.createElement("button");
                    edit_button.id = "editRule_Button_" + i;
                    edit_button.classList = "w3-btn";
                    edit_button.style = "height:2em;float:right;padding:3px 16px;"
                    var edit_button_text = document.createTextNode("Edit");

                    edit_button.appendChild(edit_button_text);
                    ruleDiv.appendChild(edit_button);
                }

                var delete_button = document.createElement("button");
                delete_button.id = "deleteRule_Button_" + i;
                delete_button.classList = "w3-btn";
                delete_button.style = "height:2em;float:right;padding:3px 16px;"
                var delete_button_text = document.createTextNode("Delete");

                delete_button.appendChild(delete_button_text);
                ruleDiv.appendChild(delete_button);

                ruleDiv.onclick = updateRuleHighlightFromRule(parsedRules[i], i);
            }
        }

        var tmpRules = self.ruleController.getAllTmpRules();
        if (tmpRules) for (i in tmpRules) {
            if (!tmpRules[i].inConcat && !tmpRules[i].deleted) {
                var ruleDiv = document.createElement('div');
                ruleDiv.style = "height:2em;position:relative;padding-left:16px";
                ruleDiv.id = "tmp_" + i + "_div";
                ruleListDiv.appendChild(ruleDiv);
                ruleDiv.innerHTML = "<span class='tag-tag'>" + self.ruleController.generateShortString(tmpRules[i]) + "</span>";

                if (self.selectedMesh) {
                    var edit_button = document.createElement("button");
                    edit_button.id = "editRule_Button_" + (i + parsedRules.length);
                    edit_button.classList = "w3-btn";
                    edit_button.style = "height:2em;float:right;padding:3px 16px;"
                    var edit_button_text = document.createTextNode("Edit");

                    edit_button.appendChild(edit_button_text);
                    ruleDiv.appendChild(edit_button);
                }

                var delete_button = document.createElement("button");
                delete_button.id = "deleteRule_Button_" + (i + parsedRules.length);
                delete_button.classList = "w3-btn";
                delete_button.style = "height:2em;float:right;padding:3px 16px;"
                var delete_button_text = document.createTextNode("Delete");

                delete_button.appendChild(delete_button_text);
                ruleDiv.appendChild(delete_button);

                ruleDiv.onclick = updateRuleHighlightFromRule(tmpRules[i], i);
            }
        }

        //create div container
        var buttonDiv = document.createElement('div');
        buttonDiv.id = "buttonDiv";

        if (self.selectedMesh) {
        //create buttons
            var new_button = document.createElement("button");
            new_button.id = "newRule_Button";
            new_button.classList = "w3-btn";
            var new_button_text = document.createTextNode("New");

        //put it together
            new_button.appendChild(new_button_text);
            buttonDiv.appendChild(new_button);
        }
        uiDiv.appendChild(ruleListDiv);
        uiDiv.appendChild(buttonDiv);

        //add functions
        if (self.selectedMesh) {
            $("#newRule_Button").click(function () {
                self.selectedRule = null;
                clearUI();
                self.initRuleUI();
            })
        }

        //parsed rules
        for (var i = 0; i < parsedRules.length; i++) {            
            if (self.selectedMesh) {
                $("#editRule_Button_" + i).click(function (i) {
                    return function () {
                        self.selectedRule = parsedRules[i];
                        if (!self.selectedRule.mode) self.selectedRule.mode = "Mode.Local";
                        self.selectedRule.storeCurrentState();
                        if (!self.selectedRule.uneditedRule)
                            self.selectedRule.uneditedRule = jQuery.extend(true, [], self.selectedRule);
                        var editor = ace.edit("code_text_ace");
                        uneditedCode = editor.getValue();
                        self.ruleIndex = i;
                        self.selectedMesh.shape.appliedRules += 1;

                        //init helper variables for will/was
                        if (!self.selectedRule.wasAppliedToList) {
                            self.selectedRule.wasAppliedToList = [];
                            self.selectedRule.wasAppliedToList.push(self.selectedMesh.shape);
                        }
                        if (!self.selectedRule.willAppliedToList) self.selectedRule.willAppliedToList = [];
                        if (!self.selectedRule.storedWasAppliedToList) self.selectedRule.storedWasAppliedToList = self.selectedRule.wasAppliedToList.slice();
                        if (!self.selectedRule.storedWillAppliedToList) self.selectedRule.storedWillAppliedToList = self.selectedRule.willAppliedToList.slice();
                        if (!self.selectedRule.wasAppliedToList.includes(self.selectedMesh.shape) &&
                            !self.selectedRule.willAppliedToList.includes(self.selectedMesh.shape)) {
                            self.selectedRule.uneditedRule.applyRule(self.selectedMesh.shape);
                            self.selectedRule.willAppliedToList.push(self.selectedMesh.shape);
                        }

                        clearUI();
                        self.initRuleUI();
                    };
                } (i))
            }
            $("#deleteRule_Button_" + i).click(function (i) {
                return function () {
                    self.ruleController.removeRule(parsedRules[i], self.selectedMesh);
                    clearUI();
                    self.initButtonsUI();
                    self.Update();
                    self.OnUpdateCompleted();
                };
            } (i))
        }

        //tmp rules
        if (tmpRules) for (i in tmpRules) {
            if (self.selectedMesh) {
                $("#editRule_Button_" + (i + parsedRules.length)).click(function (i) {
                    return function () {
                        self.selectedRule = tmpRules[i];
                        self.selectedRule.storeCurrentState();
                        if (!self.selectedRule.uneditedRule)
                            self.selectedRule.uneditedRule = jQuery.extend(true, [], self.selectedRule);
                        self.selectedMesh.shape.appliedRules += 1;

                        //init helper variables for will/was

                        if (!self.selectedRule.wasAppliedToList) {
                            self.selectedRule.wasAppliedToList = [];
                            self.selectedRule.wasAppliedToList.push(self.selectedMesh.shape);
                        }
                        if (!self.selectedRule.willAppliedToList) self.selectedRule.willAppliedToList = [];
                        if (!self.selectedRule.storedWasAppliedToList) self.selectedRule.storedWasAppliedToList = self.selectedRule.wasAppliedToList.slice();
                        if (!self.selectedRule.storedWillAppliedToList) self.selectedRule.storedWillAppliedToList = self.selectedRule.willAppliedToList.slice();
                        if (!self.selectedRule.wasAppliedToList.includes(self.selectedMesh.shape) &&
                            !self.selectedRule.willAppliedToList.includes(self.selectedMesh.shape)) {
                            self.selectedRule.uneditedRule.applyRule(self.selectedMesh.shape);
                            self.selectedRule.willAppliedToList.push(self.selectedMesh.shape);
                        }

                        clearUI();
                        self.initRuleUI();
                    };
                } (i))
            }
            $("#deleteRule_Button_" + (i + parsedRules.length)).click(function (i) {
                return function () {
                    self.ruleController.removeRule(tmpRules[i], self.selectedMesh);
                    self.ruleController.addPreview(self.selectedMesh.shape, "green");
                    clearUI();
                    self.initButtonsUI();
                    self.Update();
                    self.OnUpdateCompleted();
                };
            } (i))
        }
    };
    self.initRuleUI = function () {
        if (self.selectedRule == null) creatingNewRule = true;
        else creatingNewRule = false;
                
        //create selector
        selectionDiv = document.createElement('div');
        selectionDiv.id = "selectionDiv";
        var innerHTML;
        if (creatingNewRule) innerHTML = '<select id="rule_selector">';
        else innerHTML = '<select id="rule_selector" style="display:none">';
        self.ruleController.rules.forEach(function(value, key, map){
            innerHTML += '<option value="' + key + '">' + key + '</option>';        
        });
        innerHTML += '</select>';
        selectionDiv.innerHTML = innerHTML;

        //create input container
        var inputDiv = document.createElement('div');
        inputDiv.id = "inputDiv";

        //create buttons
        var commit_button = document.createElement('button');
        commit_button.id = "commit_Button";
        var commit_button_text = document.createTextNode("Commit");
        commit_button.appendChild(commit_button_text);
        var cancel_button = document.createElement('button');
        cancel_button.id = "cancel_Button";
        var cancel_buttonn_text = document.createTextNode("Cancel");
        cancel_button.appendChild(cancel_buttonn_text);

        //create will/was applied div
        var willwas_div = document.createElement('div');
        willwas_div.id = "willwas_div";
        var status_div = document.createElement('div');
        status_div.id = "willwas_status";
        status_div.style.display = "inline";
        var willwas_status = document.createTextNode("Currently the rule WILL be applied ");
        status_div.appendChild(willwas_status);
        willwas_div.appendChild(status_div);
        var willwas_button = document.createElement('button');
        willwas_button.id = "willwas_button";
        var willwas_button_text = document.createTextNode("change");
        willwas_button.appendChild(willwas_button_text);
        if (creatingNewRule || self.selectedRule.generatesMultipleShapes) {
            willwas_button.style.display = "none";
        }
        if (self.selectedRule && self.selectedRule.wasAppliedToList.includes(self.selectedMesh.shape)) {
            status_div.innerHTML = "Currently the rule WAS applied. ";
        }
        willwas_div.appendChild(willwas_button);

        //get goals of current shape
        if (self.selectedMesh.shape.semantics.goal) {
            var goals = Object.keys(self.selectedMesh.shape.semantics.goals);
        }

        //put it together
        uiDiv.appendChild(selectionDiv);
        uiDiv.appendChild(inputDiv);
        uiDiv.appendChild(willwas_div);
        self.postfixController.addAllPostfixes(uiDiv, self.selectedRule, goals);
        uiDiv.appendChild(commit_button);
        uiDiv.appendChild(cancel_button);

        //remove old input fields
        var inputDiv = document.getElementById("inputDiv");
        while (inputDiv.hasChildNodes()) {
            inputDiv.removeChild(inputDiv.lastChild);
        }

        //set selector to current rule
        var selector = document.getElementById("rule_selector");
        if (!creatingNewRule) {
            for (i = 0; i < selector.options.length; i++) {
                if (selector.options[i].value == self.selectedRule.type)
                    selector.selectedIndex = i;
            }
            selector.disabled = true;
        }

        //create new rule if necessary
        if (creatingNewRule) {
            self.selectedRule = self.ruleController.rules.get(selector.options[selector.selectedIndex].value)();
            var postfixDiv = document.getElementById("postfixDiv");
            if (postfixDiv) self.postfixController.applyPostfixes(postfixDiv, self.selectedRule);
            self.ruleController.addRule(self.selectedMesh.shape, self.selectedRule);
            selector.disabled = false;
            self.selectedRule.uneditedRule = null;
        }

        //init helper variables for will/was
        if (!self.selectedRule.wasAppliedToList) {
            self.selectedRule.wasAppliedToList = [];
            self.selectedRule.wasAppliedToList.push(self.selectedMesh.shape);
        }
        if (!self.selectedRule.willAppliedToList) self.selectedRule.willAppliedToList = [];
        if (!self.selectedRule.storedWasAppliedToList) self.selectedRule.storedWasAppliedToList = self.selectedRule.wasAppliedToList.slice();
        if (!self.selectedRule.storedWillAppliedToList) self.selectedRule.storedWillAppliedToList = self.selectedRule.willAppliedToList.slice();

        //create new input fields
        self.selectedRule.appendInputFields(inputDiv);

        //add function
        $('#rule_selector').change(function () {
            //remove old rule and input fields
            self.ruleController.removeRule(self.selectedRule, self.selectedMesh);
            var inputDiv = document.getElementById("inputDiv");
            while (inputDiv.hasChildNodes()) {
                inputDiv.removeChild(inputDiv.lastChild);
            }

            //create new rule and input fields
            var selector = document.getElementById("rule_selector");
            var selection = selector.options[selector.selectedIndex].value;
            self.selectedRule = self.ruleController.createRule(selection);
            self.ruleController.addRule(self.selectedMesh.shape, self.selectedRule);
            self.selectedRule.appendInputFields(inputDiv, true);
            var postfixDiv = document.getElementById("postfixDiv");
            if (postfixDiv) self.postfixController.applyPostfixes(postfixDiv, self.selectedRule);

            //init helper variables for will/was
            if (!self.selectedRule.wasAppliedToList) {
                self.selectedRule.wasAppliedToList = [];
                self.selectedRule.wasAppliedToList.push(self.selectedMesh.shape);
            }
            if (!self.selectedRule.willAppliedToList) self.selectedRule.willAppliedToList = [];
            if (!self.selectedRule.storedWasAppliedToList) self.selectedRule.storedWasAppliedToList = self.selectedRule.wasAppliedToList.slice();
            if (!self.selectedRule.storedWillAppliedToList) self.selectedRule.storedWillAppliedToList = self.selectedRule.willAppliedToList.slice();

            self.inputChanged();
        });

        $("#commit_Button").click(function () {
            self.selectedRule.storedWasAppliedToList = null;
            self.selectedRule.storedWillAppliedToList = null;

            self.ruleController.updateRule(self.selectedMesh.shape, self.selectedRule);

            var inputFieldController = getInputFieldController();
            for (var i = 0; i < self.selectedRule.fieldIds.length; i++) {
                inputFieldController.removeInputField(self.selectedRule.fieldIds[i]);
            }
            self.selectedRule.fieldIds = null;

            self.selectedRule = null;

            clearUI();
            self.initButtonsUI();
            self.Update();
            self.OnUpdateCompleted();
        });

        $("#cancel_Button").click(function () {
            if (self.selectedRule.wasAppliedToList.includes(self.selectedMesh.shape) &&
                !self.selectedRule.storedWasAppliedToList.includes(self.selectedMesh.shape)) {
                self.selectedRule.uneditedRule.applyRule(self.selectedMesh.shape);
                self.selectedRule.uneditedRule.afterUnapply(self.selectedMesh.shape);
            }
            if (self.selectedRule.willAppliedToList.includes(self.selectedMesh.shape) &&
                !self.selectedRule.storedWillAppliedToList.includes(self.selectedMesh.shape)) {
                self.selectedRule.uneditedRule.unapplyRule(self.selectedMesh.shape);
                self.selectedRule.uneditedRule.afterUnapply(self.selectedMesh.shape);
            }
            self.selectedRule.wasAppliedToList = self.selectedRule.storedWasAppliedToList.slice();
            self.selectedRule.willAppliedToList = self.selectedRule.storedWillAppliedToList.slice();
            self.selectedRule.storedWasAppliedToList = null;
            self.selectedRule.storedWillAppliedToList = null;


            if (creatingNewRule) {
                self.ruleController.removeRule(self.selectedRule, self.selectedMesh);
            } else {
                self.selectedRule.setStoredState();
                self.ruleController.updateRule(self.selectedMesh.shape, self.selectedRule);
                if (self.selectedRule.wasParsed) {
                    var editor = ace.edit("code_text_ace");
                    editor.setValue(uneditedCode);
                }
                self.ruleController.removePreview(self.selectedMesh.shape);
            }
            self.ruleController.addPreview(self.selectedMesh.shape, "green");

            var inputFieldController = getInputFieldController();
            for (var i = 0; i < self.selectedRule.fieldIds.length; i++) {
                inputFieldController.removeInputField(self.selectedRule.fieldIds[i]);
            }
            self.selectedRule.fieldIds = null;

            self.selectedRule = null;
            clearUI();
            self.initButtonsUI();
            self.Update();
            self.OnUpdateCompleted();
        });

        $("#willwas_button").click(function () {
            var status = document.getElementById("willwas_status");
            if (self.selectedRule.wasAppliedToList.includes(self.selectedMesh.shape)) {
                var index = self.selectedRule.wasAppliedToList.indexOf(self.selectedMesh.shape);
                if (index > -1) {
                    self.selectedRule.wasAppliedToList.splice(index, 1);
                }
                self.selectedRule.willAppliedToList.push(self.selectedMesh.shape);
                status.innerHTML = "Currently the rule WILL be applied. ";
                self.selectedRule.uneditedRule.applyRule(self.selectedMesh.shape);

                self.selectedRule.removePreview(self.selectedMesh.shape);
                self.selectedRule.addPreview(self.selectedMesh.shape, "green");
                renderer.RenderSingleFrame();

                self.inputChanged();
            } else {
                self.selectedRule.wasAppliedToList.push(self.selectedMesh.shape);
                var index = self.selectedRule.willAppliedToList.indexOf(self.selectedMesh.shape);
                if (index > -1) {
                    self.selectedRule.willAppliedToList.splice(index, 1);
                }
                status.innerHTML = "Currently the rule WAS applied. ";
                self.selectedRule.uneditedRule.unapplyRule(self.selectedMesh.shape);

                self.selectedRule.uneditedRule.removePreview(self.selectedMesh.shape);
                self.selectedRule.uneditedRule.addPreview(self.selectedMesh.shape, "green");
                renderer.RenderSingleFrame();

                self.inputChanged();
            }
            self.RenderSingleFrame();
        });

        //create handles
        self.handlesScene.remove(self.handlesScene.children);
        self.selectedRule.createHandles(self.handlesScene, self.selectedMesh);
        handlesType = selector.options[selector.selectedIndex].value;

        self.RenderSingleFrame();
    };

    clearUI = function () {
        for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
            self.handlesScene.remove(self.handlesScene.children[i]);
        for (var i = uiDiv.children.length - 1; i >= 0; --i) {
            uiDiv.removeChild(uiDiv.childNodes[i]);
        }
    };
    removeRuleUI = function () {
        var uiDiv = document.getElementById("uiDiv");
        if (uiDiv != null)
            uiDiv.parentNode.removeChild(uiDiv);
    };
    removeButtonUI = function () {
        var buttonDiv = document.getElementById("buttonDiv");
        if (buttonDiv != null)
            buttonDiv.parentNode.removeChild(buttonDiv);
    };

    self.inputChanged = function () {
        var postfixDiv = document.getElementById("postfixDiv");
        if (postfixDiv) {
            self.selectedRule.postfixes = {};
            self.postfixController.applyPostfixes(postfixDiv, self.selectedRule);
        }
        self.ruleController.updateRule(self.selectedMesh.shape, self.selectedRule);

        while (self.handlesScene.children.length > 0) {
            self.handlesScene.remove(self.handlesScene.children[0]);
        }
        if (overHandle || dragging) {
            self.selectedRule.createHandles(self.handlesScene, self.selectedMesh, handleId);
        } else {
            self.selectedRule.createHandles(self.handlesScene, self.selectedMesh);
        }

        var willwas_button = document.getElementById("willwas_button");
        if (self.selectedRule.generatesMultipleShapes || self.selectedRule.uneditedRule == null) {
            willwas_button.style.display = "none";
        } else {
            willwas_button.style.display = "inline";
        }

        self.RenderSingleFrame();
    };

    return self;
}