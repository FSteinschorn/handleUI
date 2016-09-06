function HandlesThreeRenderer(domQuery) {
    var self = new InteractiveThreeRenderer(domQuery, true);

    self.selectedMesh = null;
    self.selectedRule = null;
    self.handlesScene = null;

    ruleController = new TempRuleController(self);

    self.initCalls.push(function () {
        document.addEventListener('click', this.onDocumentMouseClick, false);
        document.addEventListener('keydown', this.onDocumentKeyDown, false);

        self.handlesScene = new THREE.Scene();
        
    });

    self.updateCalls.push(function () {
        self.raycastScene(ruleController.previewScene);
        self.raycastScene(self.handlesScene);
    });

    self.renderCalls.push(function () {
        this.renderer.render(ruleController.previewScene, this.camera);
        this.renderer.render(self.handlesScene, this.camera);
    });

    self.onDocumentMouseClick = function onDocumentMouseClick(event) {
        if (self.picked) {
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

            var axes = self.buildAxes(node.shape.appearance.transformation);

            self.initButtonsUI(event.clientX - self.container.offset().left, event.clientY - self.container.offset().top);

            self.Update();
            self.RenderSingleFrame();
        }
    }

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

    self.buildAxes = function (mat) {
        var axes = [];

        var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        center = new THREE.Vector3(0, 0, 0);
        xDir = new THREE.Vector3(1.0, 0, 0);
        yDir = new THREE.Vector3(0, 1.0, 0);
        zDir = new THREE.Vector3(0, 0, 1.0);
        center.applyProjection(m);
        xDir.applyProjection(m);
        yDir.applyProjection(m);
        zDir.applyProjection(m);
        xDir.sub(center);
        yDir.sub(center);
        zDir.sub(center);

        self.handlesScene.add(new THREE.ArrowHelper(xDir.normalize(), center, xDir.length(), 0xFF3030));
        self.handlesScene.add(new THREE.ArrowHelper(yDir.normalize(), center, yDir.length(), 0x30FF30));
        self.handlesScene.add(new THREE.ArrowHelper(zDir.normalize(), center, zDir.length(), 0x3030FF));
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

        var edit_button = document.createElement("button");
        edit_button.id = "editRule_Button";
        var edit_button_text = document.createTextNode("Edit");

        var delete_button = document.createElement("button");
        delete_button.id = "deleteRule_Button";
        var delete_button_text = document.createTextNode("Delete");

        //put it together
        new_button.appendChild(new_button_text);
        edit_button.appendChild(edit_button_text);
        delete_button.appendChild(delete_button_text);
        buttonDiv.appendChild(new_button);
        buttonDiv.appendChild(edit_button);
        buttonDiv.appendChild(delete_button);
        document.getElementById("basicRendererContainer").appendChild(buttonDiv);
        buttonDiv.appendChild(edit_button);

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

        //create tag field
        var tagDiv = document.createElement('div');
        tagDiv.id = "tagDiv";
        tagDiv.innerHTML= '<textarea id="tagField"></textarea>';

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
        cancel_button.id = "commit_Button";
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
        $('#tagField').tagEditor();
        $('#tagField').tagEditor('addTag', self.selectedMesh.shape.relations.rule);
        for (i=0; i<self.selectedMesh.shape.semantics.tags.length; i++) {
            $('#tagField').tagEditor('addTag', self.selectedMesh.shape.semantics.tags[i]);
        }

        $('#rule_selector').change(function () {
            self.initInputFields();            
        });

        $("#commit_Button").click(function () {
            var selector = document.getElementById("rule_selector");
            var selection = selector.options[selector.selectedIndex].value;

            var rule = ruleController.rules.get(selection).createRuleDescriptor();
            var tags = {
                fulfills: $('#tagField').tagEditor('getTags')[0].tags
            }
            rule.tags = tags;

            self.selectedMesh.shape.interaction.selected(false);
            if (self.selectedRule) {
                ruleController.updateRule(self.selectedMesh.shape, rule);
            } else {
                ruleController.addRule(self.selectedMesh.shape, rule);
            }
            self.selectedMesh = null;
            clearUI();
            self.Update();
            self.OnUpdateCompleted();
        })

        $("#cancel_Button").click(function () {
            removeRuleUI();
        })

        //set selector to current rule
        if (self.selectedRule) {
            var selector = document.getElementById("rule_selector");
            selector.selectedIndex
            for (i = 0; i < selector.options.length; i++) {
                if (selector.options[i].value == self.selectedRule.type)
                    selector.selectedIndex = i;
            }
        }
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