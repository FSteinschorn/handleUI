function HandlesThreeRenderer(domQuery) {
    var self = new InteractiveThreeRenderer(domQuery, true);

    self.selectedMesh = null;
    self.selectedRule = null;
    self.handlesScene = null;
    self.parsedRules = [];

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
    self.ruleController = new TempRuleController(self);

    //create div container
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
    document.getElementById("graphRendererContainer").appendChild(scrollDiv);

    self.codeParseNeeded = true;

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
    }

    self.wireframeClearCallback = function () {}

    self.lineHitCallback = function (intersects) {
        overHandle = true;
        handleId = intersects[0].object.id;
        self.intersection = intersects[0].point;
        self.ruleController.rules.get(handlesType).onMouseOverHandle(handleId);
    }

    self.lineClearCallback = function () {
        overHandle = false;
        self.intersection = null;
        self.ruleController.rules.get(handlesType).onMouseNotOverHandle();
    }

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
            self.ruleController.rules.get(handlesType).onHandlePressed(handleId, self.mouse, self.intersection, self.handlesScene, self.camera);
            dragging = true;
            self.controls.enabled = false;
        }
        else if (self.picked) {
            var node = self.resolveNode(self.picked);
            if (node == self.selectedMesh) return;

            if (self.selectedMesh) {
                // remove old selection and ui
                self.selectedMesh.shape.interaction.selected(false);
                for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
                    self.handlesScene.remove(self.handlesScene.children[i]);
                clearUI();
                self.initButtonsUI();
            }

            // create new selection and ui
            node.shape.interaction.selected(true);
            self.selectedMesh = node;

//            self.initButtonsUI();

            self.Update();
            self.RenderSingleFrame();
        }
    }

    self.parseCode = function () {
        if (lastGrammarResponse.parsedJSON == "") {
            self.initButtonsUI();
            return;
        }
        var parsedCode = JSON.parse(lastGrammarResponse.parsedJSON);
        var parsedRules = [];

        var NOTHING = 0, RULE = 1;
        var mode = NOTHING;

        var counter = 0, ruleStart;
        var ruleBuffer;
        var expectedRulesStart = null;
        var current = null;
        while (counter < parsedCode.length) {
            current = parsedCode[counter];
            switch (mode) {
                case NOTHING:
                    if (current.Text == 'new' && current.RawKind == 8354) {
                        expectedRulesStart = current.SpanStart + current.SpanLength + 1;
                        ruleStart = current.SpanStart;
                        counter += 1;
                    }
                    else if (current.Text == 'Rules' && current.RawKind == 8508 && current.SpanStart == expectedRulesStart) {
                        mode = RULE;
                        ruleBuffer = [];
                        counter += 2;
                    } else {
                        counter += 1;
                    }
                    break;

                case RULE:
                    if (current.Text == ';' && current.RawKind == 8212) {
                        mode = NOTHING;
                        [ruleDescriptor, postfixStart] = self.ruleController.parseRule(ruleBuffer);
                        var rule = self.postfixController.parsePostfixes(ruleDescriptor, ruleBuffer.slice(postfixStart));
                        rule.start = ruleStart;
                        rule.end = current.SpanStart + current.SpanLength;
                        rule.deleted = false;
                        rule.edited = false;
                        rule.wasParsed = true;
                        parsedRules.push(rule);
                    } else {
                        ruleBuffer.push(current);
                    }
                    counter += 1;
                    break;

                default:
                    break;
            }
        }

        self.ruleController.setParsedRules(parsedRules);

        clearUI();
        self.initButtonsUI();
    }

    self.onDocumentMouseMove = function onDocumentMouseMove(event) {
        /*
        if (self.codeParseInitialized == false && (typeof lastGrammarResponse != 'undefined') && lastGrammarResponse != null) {
            self.codeParseInitialized = true;
            self.parseCode();
        }
        */

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
            if (dragging && (handlesType != null)) self.ruleController.rules.get(handlesType).onHandleDragged(self.mouse);
        }
        self.Update();
    }

    self.onDocumentMouseUp = function (event) {
        if (dragging) {
            self.ruleController.rules.get(handlesType).onHandleReleased();
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
    }



    self.initButtonsUI = function () {
        var ruleListDiv = document.createElement('div');
        ruleListDiv.id = "ruleListDiv";
        ruleListDiv.classList = "w3-container";
        ruleListDiv.style = "position:relative;";

        var parsedRules = self.ruleController.getParsedRules();
        for (var i = 0; i < parsedRules.length; i++) {
            if (!parsedRules[i].deleted && !parsedRules[i].edited && !parsedRules[i].inConcat) {
                var ruleDiv = document.createElement('div');
                ruleDiv.style = "height:2em;position:relative;";
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
            }
        }
        /*
        if (self.selectedMesh) {
            var history = self.ruleController.getRuleHistory(self.selectedMesh.shape);
        }
        */
        var tmpRules = self.ruleController.getAllTmpRules();
        if (tmpRules) for (var i = 0; i < tmpRules.length; i++) {
            if (!tmpRules[i].inConcat) {
                var ruleDiv = document.createElement('div');
                ruleDiv.style = "height:2em;position:relative;";
                ruleListDiv.appendChild(ruleDiv);
                ruleDiv.innerHTML = "<span class='tag-tag'>" + self.ruleController.generateShortString(tmpRules[i]) + "</span>";

                if (self.selectedMesh) {
                    var edit_button = document.createElement("button");
                    edit_button.id = "editRule_Button_" + (i + parsedRules.lenght);
                    edit_button.classList = "w3-btn";
                    edit_button.style = "height:2em;float:right;padding:3px 16px;"
                    var edit_button_text = document.createTextNode("Edit");

                    edit_button.appendChild(edit_button_text);
                    ruleDiv.appendChild(edit_button);
                }

                var delete_button = document.createElement("button");
                delete_button.id = "deleteRule_Button_" + (i + parsedRules.lenght);
                delete_button.classList = "w3-btn";
                delete_button.style = "height:2em;float:right;padding:3px 16px;"
                var delete_button_text = document.createTextNode("Delete");

                delete_button.appendChild(delete_button_text);
                ruleDiv.appendChild(delete_button);
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
                        uneditedRule = self.selectedRule;
                        var editor = ace.edit("code_text_ace");
                        uneditedCode = editor.getValue();
                        self.ruleIndex = i;
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
        if (tmpRules) for (var i = 0; i < tmpRules.length; i++) {
            if (self.selectedMesh) {
                $("#editRule_Button_" + (i + parsedRules.lenght)).click(function (i) {
                    return function () {
                        self.selectedRule = tmpRules[i];
                        uneditedRule = self.selectedRule;
                        clearUI();
                        self.initRuleUI();
                    };
                } (i))
            }
            $("#deleteRule_Button_" + (i + parsedRules.lenght)).click(function (i) {
                return function () {
                    self.ruleController.removeRule(tmpRules[i], self.selectedMesh);
                    clearUI();
                    self.initButtonsUI();
                    self.Update();
                    self.OnUpdateCompleted();
                };
            } (i))
        }
    }

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
        innerHTML += '</select>'
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

        //get goals of current shape
        if (self.selectedMesh.shape.semantics.goal) {
            var goals = Object.keys(self.selectedMesh.shape.semantics.goals);
        }

        //put it together
        uiDiv.appendChild(selectionDiv);
        uiDiv.appendChild(inputDiv);
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
            /*
            //remove old input fields
            var inputDiv = document.getElementById("inputDiv");
            while (inputDiv.hasChildNodes()) {
                inputDiv.removeChild(inputDiv.lastChild);
            }
            //create new input fields
            var selector = document.getElementById("rule_selector");
            var selection = selector.options[selector.selectedIndex].value;
            self.ruleController.rules.get(selection).appendInputFields(inputDiv, self.selectedRule);
            //create handles

            self.handlesScene.remove(self.handlesScene.children);
            self.ruleController.rules.get(selection).createHandles(self.handlesScene, self.selectedMesh);
            handlesType = selection;
            */
        }

        //create new input fields
        var selection = selector.options[selector.selectedIndex].value;
        self.ruleController.rules.get(selection).appendInputFields(inputDiv, self.selectedRule);

        //create new rule if necessary
        if (creatingNewRule) {
            self.selectedRule = self.ruleController.rules.get(selection).createRuleDescriptor(null);
            var postfixDiv = document.getElementById("postfixDiv");
            if (postfixDiv) self.postfixController.applyPostfixes(postfixDiv, self.selectedRule);
            self.ruleController.addRule(self.selectedMesh.shape, self.selectedRule);
            selector.disabled = false;
        }

        //add function
        $('#rule_selector').change(function () {
            //remove old input fields
            var inputDiv = document.getElementById("inputDiv");
            while (inputDiv.hasChildNodes()) {
                inputDiv.removeChild(inputDiv.lastChild);
            }

            self.inputChanged();

            //create new input fields
            var selector = document.getElementById("rule_selector");
            var selection = selector.options[selector.selectedIndex].value;
            handlesType = selection;
            self.ruleController.rules.get(selection).appendInputFields(inputDiv, null);
        });

        $("#commit_Button").click(function () {
            var selector = document.getElementById("rule_selector");
            var selection = selector.options[selector.selectedIndex].value;

            var rule = self.ruleController.rules.get(selection).createRuleDescriptor(self.selectedRule);
            var postfixDiv = document.getElementById("postfixDiv");
            if (postfixDiv) self.postfixController.applyPostfixes(postfixDiv, rule);
            self.ruleController.updateRule(self.selectedMesh.shape, self.selectedRule, rule);

            self.selectedRule = null;

//            self.selectedMesh.shape.interaction.selected(false);
//            self.selectedMesh = null;
            clearUI();
            self.initButtonsUI();
            self.Update();
            self.OnUpdateCompleted();
        })

        $("#cancel_Button").click(function () {
            if (creatingNewRule) {
                self.ruleController.removeRule(self.selectedRule);
            } else {
                if (currentRuleWasParsed) {
                    self.ruleController.removeRule(self.selectedRule);
                    var editor = ace.edit("code_text_ace");
                    editor.setValue(uneditedCode);
                } else {
                    self.ruleController.updateRule(self.selectedMesh.shape, self.selectedRule, uneditedRule);
                }
                
            }
            self.selectedRule = null;
//            self.selectedMesh.shape.interaction.selected(false);
//            self.selectedMesh = null;
            clearUI();
            self.initButtonsUI();
            self.Update();
            self.OnUpdateCompleted();
        })

        

        //create handles
        self.handlesScene.remove(self.handlesScene.children);
        self.ruleController.rules.get(selection).createHandles(self.handlesScene, self.selectedMesh);
        handlesType = selection;

        self.RenderSingleFrame();
    }

    self.inputChanged = function () {
        var selector = document.getElementById("rule_selector");
        var selection = selector.options[selector.selectedIndex].value;

        var rule = self.ruleController.rules.get(selection).createRuleDescriptor(self.selectedRule);
        var postfixDiv = document.getElementById("postfixDiv");
        if (postfixDiv) self.postfixController.applyPostfixes(postfixDiv, rule);
        self.ruleController.updateRule(self.selectedMesh.shape, self.selectedRule, rule);
        self.selectedRule = rule;

        while (self.handlesScene.children.length > 0) {
            self.handlesScene.remove(self.handlesScene.children[0]);
        }
        if (overHandle || dragging) {
            self.ruleController.rules.get(selection).createHandles(self.handlesScene, self.selectedMesh, handleId);
        } else {
            self.ruleController.rules.get(selection).createHandles(self.handlesScene, self.selectedMesh);
        }

        self.RenderSingleFrame();
    }

    clearUI = function () {
        for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
            self.handlesScene.remove(self.handlesScene.children[i]);
        for (var i = uiDiv.children.length - 1; i >= 0; --i) {
            uiDiv.removeChild(uiDiv.childNodes[i]);
        }
//        removeRuleUI();
//        removeButtonUI();
    }

    removeRuleUI = function () {
        var uiDiv = document.getElementById("uiDiv");
        if (uiDiv != null)
            uiDiv.parentNode.removeChild(uiDiv);
    }

    removeButtonUI = function () {
        var buttonDiv = document.getElementById("buttonDiv");
        if (buttonDiv != null)
            buttonDiv.parentNode.removeChild(buttonDiv);
    }

    return self;
}