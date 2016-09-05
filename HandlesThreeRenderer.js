function HandlesThreeRenderer(domQuery) {
    var self = new InteractiveThreeRenderer(domQuery, true);

    self.selectedMesh = null;
    self.selectedRule = null;
    self.handlesScene = null;

    self.ruleController = new TempRuleController(self);

    self.initCalls.push(function () {
        document.addEventListener('click', this.onDocumentMouseClick, false);
        document.addEventListener('keydown', this.onDocumentKeyDown, false);

        self.handlesScene = new THREE.Scene();
        
    });

    self.updateCalls.push(function () {
        self.raycastScene(self.ruleController.previewScene);
    });

    self.renderCalls.push(function () {
        this.renderer.render(self.ruleController.previewScene, this.camera);
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
            self.handlesScene.add(axes);

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
        var axes = new THREE.Object3D();

        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.0, 0, 0), 0xFF3030, false)); // +X
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.5 * 1.0, 0, 0), 0xA00000, true)); // -X
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.0, 0), 0x30FF30, false)); // +Y
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.5 * 1.0, 0), 0x00A000, true)); // -Y
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1.0), 0x3030FF, false)); // +Z
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -0.5 * 1.0), 0x0000A0, true)); // -Z

        var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        axes.applyMatrix(m);

        return axes;
    }

    self.buildAxis = function (src, dst, colorHex, dashed) {
        var geom = new THREE.Geometry(),
            mat;

        if (dashed) {
            mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
        } else {
            mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
        }

        geom.vertices.push(src.clone());
        geom.vertices.push(dst.clone());
        geom.computeLineDistances();

        var axis = new THREE.Line(geom, mat, THREE.LinePieces);
        axis.castShadow = false;
        axis.receiveShadow = false;
        return axis;

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
            self.selectedRule = self.ruleController.getRule(self.selectedMesh.shape);
            clearUI();
            self.initRuleUI();
        })

        $("#deleteRule_Button").click(function () {
            self.ruleController.removeRule(self.selectedMesh.shape);
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
        selectionDiv.innerHTML = '<select id="rule_selector">'+
                                    '<option value="translate">Translate</option>'+
                                    '<option value="rotate">Rotate</option>'+
                                    '<option value="scale">Scale</option>'+
                                '</select>';

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

        //init input fields
        self.initInputFields();

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
            switch (selection) {
                case 'translate':
                    var rule = {
                        type: "translate",
                        x: document.getElementById("x_input_field").value,
                        y: document.getElementById("y_input_field").value,
                        z: document.getElementById("z_input_field").value,
                    }
                    break;
                case 'rotate':
                    var rule = {
                        type: "rotate",
                        axis: document.getElementById("axis_selector").options[selector.selectedIndex].value,
                        angle: document.getElementById("angle_input_field").value,
                    }
                    break;
                case 'scale':
                    var rule = {
                        type: "scale",
                        x: document.getElementById("x_input_field").value,
                        y: document.getElementById("y_input_field").value,
                        z: document.getElementById("z_input_field").value,
                    }
                    break;
                default:
                    break;
            }
            var tags = {
                fulfills: $('#tagField').tagEditor('getTags')[0].tags
            }
            rule.tags = tags;
            self.selectedMesh.shape.interaction.selected(false);
            if (self.selectedRule) {
                self.ruleController.updateRule(self.selectedMesh.shape, rule);
            } else {
                self.ruleController.addRule(self.selectedMesh.shape, rule);
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
                if (selector.options[i].value == rule.type)
                    selector.selectedIndex = i;
            }
        }
    }

    self.initInputFields = function () {
        //remove old input fields
        var inputDiv = document.getElementById("inputDiv");
        while (inputDiv.hasChildNodes()) {
            inputDiv.removeChild(inputDiv.lastChild);
        }

        //create new input fields
        var selector = document.getElementById("rule_selector");
        var selection = selector.options[selector.selectedIndex].value;
        switch (selection) {
            case 'translate':
            case 'scale':
                var x_input = document.createElement("input");
                x_input.setAttribute('type', 'text');
                x_input.setAttribute('id', 'x_input_field');
                var y_input = document.createElement("input");
                y_input.setAttribute('type', 'text');
                y_input.setAttribute('id', 'y_input_field');
                var z_input = document.createElement("input");
                z_input.setAttribute('type', 'text');
                z_input.setAttribute('id', 'z_input_field');
                if (self.selectedRule) {
                    x_input.setAttribute('value', self.selectedRule.x);
                    y_input.setAttribute('value', self.selectedRule.y);
                    z_input.setAttribute('value', self.selectedRule.z);
                } else {
                    x_input.setAttribute('value', '0');
                    y_input.setAttribute('value', '0');
                    z_input.setAttribute('value', '0');

                }
                inputDiv.appendChild(x_input);
                inputDiv.appendChild(y_input);
                inputDiv.appendChild(z_input);
                break;
            case 'rotate':
                axisDiv = document.createElement('div');
                axisDiv.id = "axisDiv";
                axisDiv.innerHTML = '<select id="axis_selector">' +
                                        '<option value="Axis.X">Axis.X</option>' +
                                        '<option value="Axis.Y">Axis.Y</option>' +
                                        '<option value="Axis.Z">Axis.Z</option>' +
                                    '</select>';
                var angle_input = document.createElement("input");
                angle_input.setAttribute('type', 'text');
                angle_input.setAttribute('id', 'angle_input_field');
                angle_input.setAttribute('value', 'Deg(0)');
                inputDiv.appendChild(axisDiv);
                inputDiv.appendChild(angle_input);
                break;
            default:
                break;
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