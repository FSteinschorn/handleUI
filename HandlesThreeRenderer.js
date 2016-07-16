function HandlesThreeRenderer(domQuery) { //for a whole window call with domQuery "<body>"
    //inherit the base class
    var self = new InteractiveThreeRenderer(domQuery, true);

    self.selectedMesh = null;
    self.handlesScene = null;

    //First we need to add a new initialization call wich will be executed after the one of InteractiveThreeRenderer
    self.initCalls.push(function () { //push the init function to the list of initCalls
        document.addEventListener('click', this.onDocumentMouseClick, false);
        document.addEventListener('keydown', this.onDocumentKeyDown, false);

        self.handlesScene = new THREE.Scene();
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
                self.removeRuleUI();
            }

            // create new selection and ui
            node.shape.interaction.selected(true);
            self.selectedMesh = node;

            var axes = self.buildAxes(node.shape.appearance.transformation);
            self.handlesScene.add(axes);

            self.initButtonsUI(event.clientX - self.container.offset().left, event.clienty - self.container.offset().top);

            self.Update();
            self.RenderSingleFrame();
        }
    }

    self.onDocumentKeyDown = function onDocumentKeyDown(event) {
        switch(event.keyCode) {
            case 27:
                if (self.selectedMesh) {
                    self.selectedMesh.shape.interaction.selected(false);
                    self.selectedMesh = null;
                    for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
                        self.handlesScene.remove(self.handlesScene.children[i]);

                    self.removeRuleUI();

                    self.Update();
                    self.RenderSingleFrame();
                }
                break;
            default:
                break;
        }
    }

    self.renderCalls.push(function () {
        this.renderer.render(self.handlesScene, this.camera);
    });


    self.buildAxes = function (mat) {
        var axes = new THREE.Object3D();

        //var sx = Math.sqrt(mat[0] * mat[0] + mat[1] * mat[1] + mat[2] * mat[2]);
        //var sy = Math.sqrt(mat[4] * mat[4] + mat[5] * mat[5] + mat[6] * mat[6]);
        //var sz = Math.sqrt(mat[8] * mat[8] + mat[9] * mat[9] + mat[10] * mat[10]);

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
        geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

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
        buttonDiv.style.left = "" + x + "px";
        buttonDiv.style.top = "-" + y + "px";
        buttonDiv.style.z_index = -1;

        //create buttons
        var new_button = document.createElement("button");
        new_button.id = "newRule_Button";
        var new_button_text = document.createTextNode("New");

        var edit_button = document.createElement("button");
        edit_button.id = "editRule_Button";
        var edit_button_text = document.createTextNode("Edit");

        //put it together
        new_button.appendChild(new_button_text);
        edit_button.appendChild(edit_button_text);
        buttonDiv.appendChild(new_button);
        buttonDiv.appendChild(edit_button);
        document.getElementById("basicRendererContainer").appendChild(buttonDiv);

        //add functions
        $("#newRule_Button").click(function () {
            self.initRuleUI();
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

        //create commit button
        var commit_button = document.createElement('button');
        commit_button.id = "commit_Button";
        var commit_button_text = document.createTextNode("Commit");

        //put it together
        uiDiv.appendChild(selectionDiv);
        uiDiv.appendChild(inputDiv);
        uiDiv.appendChild(tagDiv);
        uiDiv.appendChild(commit_button);
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
                    var x_field = document.getElementById("x_input_field");
                    var y_field = document.getElementById("y_input_field");
                    var z_field = document.getElementById("z_input_field");
                    self.addNewTranslation(x_field.value, y_field.value, z_field.value);
                    break;
                case 'rotate':
                    break;
                case 'scale':
                    break;
                default:
                    break;
            }
        })
    }

    self.removeRuleUI = function () {
        var uiDiv = document.getElementById("uiDiv");
        uiDiv.parentNode.removeChild(uiDiv);
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
                var x_input = document.createElement("input");
                x_input.setAttribute('type', 'text');
                x_input.setAttribute('id', 'x_input_field');
                x_input.setAttribute('value', '0');
                var y_input = document.createElement("input");
                y_input.setAttribute('type', 'text');
                y_input.setAttribute('id', 'y_input_field');
                y_input.setAttribute('value', '0');
                var z_input = document.createElement("input");
                z_input.setAttribute('type', 'text');
                z_input.setAttribute('id', 'z_input_field');
                z_input.setAttribute('value', '0');
                inputDiv.appendChild(x_input);
                inputDiv.appendChild(y_input);
                inputDiv.appendChild(z_input);
                break;
            case 'rotate':
                break;
            case 'scale':
                break;
            default:
                break;
        }
    }

    self.addNewTranslation = function (x, y, z) {
        /*var m = self.selectedMesh.shape.appearance.transformation;
        var matrix = new THREE.Matrix4().set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], m[12], m[13], m[14], m[15]);
        var translation = new THREE.Matrix4().makeTranslation(x, y, z);
        matrix.multiply(translation);*/
        var shape = self.selectedMesh.shape;

        self.selectedMesh.shape.interaction.selected(false);
        self.selectedMesh = null;
        for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
            self.handlesScene.remove(self.handlesScene.children[i]);

        shape.appearance.transformation[3] += parseFloat(x);
        shape.appearance.transformation[7] += parseFloat(y);
        shape.appearance.transformation[11] += parseFloat(z);

        self.removeRuleUI();

        self.addShape(shape);
        self.Update();
        self.OnUpdateCompleted();

        var editor = ace.edit("code_text_ace");
        var code = editor.getValue();
        editor.setValue(code + "\n\n" + "new Rules.Translate(Vec3("+x+", "+y+", "+z+"));", 1);
    }

    // $("#code_editor")[0].CodeMirror.setValue(getOldCode + generated rule);

    return self;
}