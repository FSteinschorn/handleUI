function HandlesThreeRenderer(domQuery) {
    var self = new InteractiveThreeRenderer(domQuery, true);

    self.selectedMesh = null;
    self.selectedRule = null;
    self.handlesScene = null;

    creatingNewRule = false;

    handlesType = null;
    handleId = 0;
    overHandle = false;
    dragging = false;

    ruleController = new TempRuleController(self);

    // define tags ("<tag_name>", <max_tags>)
    self.tags = new Map([
        ["category1", new Map([
            ["tag1", 100],
            ["tag2", 1]
        ])],
        ["category2", new Map([
            ["tag3", 100],
            ["tag4", 1]
        ])]
    ])

    self.applyTags = function (rule) {

    }

    self.initCalls.push(function () {
        document.addEventListener('click', this.onDocumentMouseClick, false);
        document.addEventListener('keydown', this.onDocumentKeyDown, false);
        document.addEventListener('mousedown', this.onDocumentMouseDown, false);
        document.addEventListener('mouseup', this.onDocumentMouseUp, false);

        self.handlesScene = new THREE.Scene();

        ace.edit("code_text_ace").$blockScrolling = Infinity;
        
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
        ruleController.rules.get(handlesType).onMouseOverHandle(handleId);
    }

    self.lineClearCallback = function () {
        overHandle = false;
        self.intersection = null;
        ruleController.rules.get(handlesType).onMouseNotOverHandle();
    }

    self.updateCalls.push(function () {
        self.raycastScene(ruleController.previewScene.children, false, self.wireframeHitCallback, self.wireframeClearCallback);
        self.raycastScene(self.handlesScene.children, true, self.lineHitCallback, self.lineClearCallback);
    });

    self.renderCalls.push(function () {
        this.renderer.render(ruleController.previewScene, this.camera);

        this.renderer.context.disable(this.renderer.context.DEPTH_TEST);
        this.renderer.render(self.handlesScene, this.camera);
        this.renderer.context.enable(this.renderer.context.DEPTH_TEST);
    });

    self.onDocumentMouseDown = function onDocumentMouseClick(event) {
        if (overHandle) {
            ruleController.rules.get(handlesType).onHandlePressed(handleId, self.mouse, self.intersection, self.handlesScene, self.camera);
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
            }

            // create new selection and ui
            node.shape.interaction.selected(true);
            self.selectedMesh = node;

            self.initButtonsUI(event.clientX - self.container.offset().left, event.clientY - self.container.offset().top);

            self.Update();
            self.RenderSingleFrame();
        }
    }

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
            if (dragging && (handlesType != null)) ruleController.rules.get(handlesType).onHandleDragged(self.mouse);
        }
        self.Update();
    }

    self.onDocumentMouseUp = function (event) {
        if (dragging) {
            ruleController.rules.get(handlesType).onHandleReleased();
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

                    self.Update();
                    self.RenderSingleFrame();
                }
                break;
            default:
                break;
        }
    }



    self.initButtonsUI = function (x, y) {
        //create div container
        var buttonDiv = document.createElement('div');
        buttonDiv.id = "buttonDiv";
        buttonDiv.style.position = "relative";
        buttonDiv.style.left = "" + (x-80) + "px";
        buttonDiv.style.top = "-" + (y) + "px";
        buttonDiv.style.z_index = -1;

        //create buttons
        var new_button = document.createElement("button");
        new_button.id = "newRule_Button";
        var new_button_text = document.createTextNode("New");

        if (ruleController.getRule(self.selectedMesh.shape) != null) {
            var edit_button = document.createElement("button");
            edit_button.id = "editRule_Button";
            var edit_button_text = document.createTextNode("Edit");

            var delete_button = document.createElement("button");
            delete_button.id = "deleteRule_Button";
            var delete_button_text = document.createTextNode("Delete");
        }

        //put it together
        new_button.appendChild(new_button_text);
        buttonDiv.appendChild(new_button);
        document.getElementById("basicRendererContainer").appendChild(buttonDiv);        
        if (ruleController.getRule(self.selectedMesh.shape) != null) {
            edit_button.appendChild(edit_button_text);
            delete_button.appendChild(delete_button_text);
            buttonDiv.appendChild(edit_button);
            buttonDiv.appendChild(delete_button);
        }

        //add functions
        $("#newRule_Button").click(function () {
            self.selectedRule = null;
            clearUI();
            self.initRuleUI();
        })

        $("#editRule_Button").click(function () {
            self.selectedRule = ruleController.getRule(self.selectedMesh.shape);
            clearUI();
            self.initRuleUI();
        })

        $("#deleteRule_Button").click(function () {
            ruleController.removeRule(self.selectedMesh.shape);
            self.selectedMesh.shape.interaction.selected(false);
            self.selectedMesh = null;
            clearUI();
            self.Update();
            self.OnUpdateCompleted();
        })
    }

    self.initRuleUI = function () {

        //create div container
        var uiDiv = document.createElement('div');
        uiDiv.id = "uiDiv";
        uiDiv.style.position = "absolute";
        uiDiv.style.bottom = "0";
        uiDiv.style.backgroundColor = "red";

        //create tag fields
        var tagDiv = document.createElement('div');
        tagDiv.id = "tagDiv";
        tagDiv.innerHTML = '';
        self.tags.forEach(function (value, key, map) {
            value.forEach(function (value, key, map) {
                var id = key + "_field";
                tagDiv.innerHTML += key + ": <textarea id=" + id + "></textarea><br>";
            })
        });

        //create selector
        selectionDiv = document.createElement('div');
        selectionDiv.id = "selectionDiv";
        var innerHTML = '<select id="rule_selector">';
        ruleController.rules.forEach(function(value, key, map){
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

        //put it together
        uiDiv.appendChild(selectionDiv);
        uiDiv.appendChild(inputDiv);
        uiDiv.appendChild(tagDiv);
        uiDiv.appendChild(commit_button);
        uiDiv.appendChild(cancel_button);
        document.getElementById("graphRendererContainer").appendChild(uiDiv);

        //remove old input fields
        var inputDiv = document.getElementById("inputDiv");
        while (inputDiv.hasChildNodes()) {
            inputDiv.removeChild(inputDiv.lastChild);
        }

        //create new input fields
        var selector = document.getElementById("rule_selector");
        var selection = selector.options[selector.selectedIndex].value;
        ruleController.rules.get(selection).appendInputFields(inputDiv, self.selectedRule);

        //add functions
        /*
        $('#tagField').tagEditor();
        $('#tagField').tagEditor('addTag', self.selectedMesh.shape.relations.rule);
        for (i=0; i<self.selectedMesh.shape.semantics.tags.length; i++) {
            $('#tagField').tagEditor('addTag', self.selectedMesh.shape.semantics.tags[i]);
        }
        */

        self.tags.forEach(function (value, key, map) {
            value.forEach(function (value, key, map) {
                var id = "#" + key + "_field";
                if (value != 1) {
                    $(id).tagEditor({
                        delimiter: " ,;",
                        placeholder: "Enter tags ...",
                        maxTags: value,
                        onChange: self.inputChanged
                    });
                } else {
                    $(id).tagEditor({
                        delimiter: " ,;",
                        placeholder: "Enter tag ...",
                        maxTags: value,
                        onChange: self.inputChanged
                    });
                }
            })
        });

        $('#rule_selector').change(function () {
            //remove old input fields
            var inputDiv = document.getElementById("inputDiv");
            while (inputDiv.hasChildNodes()) {
                inputDiv.removeChild(inputDiv.lastChild);
            }

            //change temporary rule to edit
            var selector = document.getElementById("rule_selector");
            var selection = selector.options[selector.selectedIndex].value;
            if (creatingNewRule)
                self.selectedRule = null;

            //create new input fields
            handlesType = selection;
            ruleController.rules.get(selection).appendInputFields(inputDiv, self.selectedRule);

            //update handles and preview
            self.inputChanged();
        });

        $("#commit_Button").click(function () {
            var selector = document.getElementById("rule_selector");
            var selection = selector.options[selector.selectedIndex].value;

            var rule = ruleController.rules.get(selection).createRuleDescriptor();
            self.applyTags(rule);
            ruleController.updateRule(self.selectedMesh.shape, rule);

            self.selectedMesh.shape.interaction.selected(false);
            self.selectedMesh = null;
            clearUI();
            self.Update();
            self.OnUpdateCompleted();
        })

        $("#cancel_Button").click(function () {
            if (creatingNewRule) {
                ruleController.removeRule(self.selectedMesh.shape);
            } else {
                ruleController.updateRule(self.selectedMesh.shape, self.selectedRule)
            }
            self.selectedMesh.shape.interaction.selected(false);
            self.selectedMesh = null;
            clearUI();
            self.Update();
            self.OnUpdateCompleted();
        })

        //set selector to current rule
        var selector = document.getElementById("rule_selector");
        if (self.selectedRule != null) {
            creatingNewRule = false;
            for (i = 0; i < selector.options.length; i++) {
                if (selector.options[i].value == self.selectedRule.type)
                    selector.selectedIndex = i;
            }
            selector.disabled = true;
            //remove old input fields
            var inputDiv = document.getElementById("inputDiv");
            while (inputDiv.hasChildNodes()) {
                inputDiv.removeChild(inputDiv.lastChild);
            }
            //create new input fields
            var selector = document.getElementById("rule_selector");
            var selection = selector.options[selector.selectedIndex].value;
            ruleController.rules.get(selection).appendInputFields(inputDiv, self.selectedRule);
            //create handles
            self.handlesScene.remove(self.handlesScene.children);
            ruleController.rules.get(selection).createHandles(self.handlesScene, self.selectedMesh);
            handlesType = selection;
        } else {
            creatingNewRule = true;
            var selection = selector.options[selector.selectedIndex].value;
            self.selectedRule = ruleController.rules.get(selection).createRuleDescriptor();
            self.applyTags(self.selectedRule);
            ruleController.addRule(self.selectedMesh.shape, self.selectedRule);
            selector.disabled = false;
        }

        //create handles
        self.handlesScene.remove(self.handlesScene.children);
        ruleController.rules.get(selection).createHandles(self.handlesScene, self.selectedMesh);
        handlesType = selection;

        self.RenderSingleFrame();
    }

    self.inputChanged = function () {
        var selector = document.getElementById("rule_selector");
        var selection = selector.options[selector.selectedIndex].value;

        var rule = ruleController.rules.get(selection).createRuleDescriptor();
        self.applyTags(rule);
        ruleController.updateRule(self.selectedMesh.shape, rule);

        for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
            self.handlesScene.remove(self.handlesScene.children[i]);
        if (overHandle || dragging) {
            ruleController.rules.get(selection).createHandles(self.handlesScene, self.selectedMesh, handleId);
        } else {
            ruleController.rules.get(selection).createHandles(self.handlesScene, self.selectedMesh);
        }

        self.RenderSingleFrame();
    }

    clearUI = function () {
        for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
            self.handlesScene.remove(self.handlesScene.children[i]);
        removeRuleUI();
        removeButtonUI();
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