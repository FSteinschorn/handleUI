function TempRuleController(renderer) {
    var self = {};

    self.rules = new Map();

    storedRules = new Map();
    meshes = new Map();

    tmpRules = [];
    parsedRules = [];

    self.previewScene = new THREE.Scene();

    var INPUTTYPE = {
        STRING: 123,
        DROPDOWN: 234,
        TAG: 345,
        TAGS: 456,
        DOUBLE: 567,
        RAW: 678,
        VEC3: 789
    };

    Number.prototype.countDecimals = function () {
        if (Math.floor(this.valueOf()) === this.valueOf()) return 0;
        var splitstring = this.toString().split(".")[1];
        if (splitstring) return splitstring.length;
        return 0;
    };
    Number.prototype.round = function (p) {
        p = p || 3;
        var rounded = Math.round(this * Math.pow(10, p)) / Math.pow(10, p);
        if (rounded.countDecimals() > p) return this.toFixed(p);
        return rounded;
    };
    Number.prototype.isOdd = function() {
        return this % 2;
    };

    function isFunction(functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
    }

    self.generateShortString = function (rule) {
        var type = rule.type;
        switch (type) {
            case 'ruleNotFound':
                return 'ERROR: rule not found!';
                break;
            case 'parseNotImplemented':
                return 'ERROR: parse not implemented!';
                break;
            default:
                return rule.generateShortString();
                break;
        }
    };

    self.addRule = function (shape, rule) {
        tmpRules.push(rule);

        rule.applyRule(shape);
        if (meshes[shape.id])
            rule.removePreview(shape)
        rule.addPreview(shape);
        
        var editor = ace.edit("code_text_ace");
        editor.setValue(editor.getValue() + "\n\n" + rule.generateRuleString(rule), 1);
    };

    self.removeRule = function (rule, shape) {
        if (rule.wasParsed && !rule.edited) {
            var editor = ace.edit("code_text_ace");
            var oldstr = editor.getValue();
            var ruleLength = rule.end - rule.start;
            editor.setValue(oldstr.substr(0, rule.start) + oldstr.substr(rule.end), 1);

            var index = renderer.ruleIndex;
            for (var j = index; j < parsedRules.length; j++) {
                parsedRules[j].start -= ruleLength;
                parsedRules[j].end -= ruleLength;
            }
            rule.deleted = true;
        } else {
            var index = tmpRules.indexOf(rule)
            if (index != -1) {
                tmpRules.splice(index, 1);

                var editor = ace.edit("code_text_ace");
                editor.setValue(editor.getValue().replace("\n\n" + rule.generateRuleString(), ""));
            }
        }
        if (shape) {
            rule.unapplyRule(shape.shape);
            rule.removePreview(shape.shape);
        }
    };

    self.updateRule = function (shape, rule) {
        if (!rule) return;
        if (!shape) return;

        // update rule
        rule.removePreview(shape);
        rule.unapplyRule(shape);
        rule.updateRule();
        rule.applyRule(shape);
        rule.addPreview(shape);

        var editor = ace.edit("code_text_ace");
        var oldString = rule.getLastRuleString();  // old string to replace
        var newString = rule.generateRuleString();  // new string to replace old one
        
        if (rule.wasParsed && !rule.edited) {
            oldString = editor.getValue();
            var ruleLength = rule.end - rule.start;
            editor.setValue(oldString.substr(0, rule.start) + oldString.substr(rule.end), 1);

            var index = renderer.ruleIndex;
            rule.edited = true;
            for (var j = index + 1; j < parsedRules.length; j++) {
                parsedRules[j].start -= ruleLength;
                parsedRules[j].end -= ruleLength;
            }
            editor.setValue(editor.getValue() + "\n\n" + rule.generateRuleString(), 1);
            tmpRules.push(rule);
        } else {
            editor.setValue(editor.getValue().replace(oldString, newString));
        }
    };

    self.createRule = function (type) {
        var factory = self.rules.get(type);
        return factory();
    };

    self.parseRule = function (ruleBuffer) {
        var ruleType = ruleBuffer[0].Text;
        var rule = self.rules.get(ruleType)();
        if (!rule) {
            rule = { type: 'ruleNotFound' };
            var position = 0;
        } else {
            position = rule.parseCode(ruleBuffer);
            var counter = position;
            while (counter < ruleBuffer.length) {
                if (ruleBuffer[position].Text == "Mode") {

                }
                counter += 1;
            }
        }
        return [rule, position];
    };

    self.setParsedRules = function(rules) {
        parsedRules = rules;
    };

    self.getParsedRules = function () {
        return parsedRules;
    };

    self.getRuleHistory = function (shape) {
        return self.getAllTmpRules[shape.id];
    };

    self.getAllTmpRules = function () {
        return tmpRules;
    };

    self.getRuleByIndex = function (indey) {
        return tmpRules[index];
    };

    addPreview = function (shape) {
        var geo;
        var t = shape.appearance.transformation;
        var matrix = new THREE.Matrix4().set(t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9], t[10], t[11], t[12], t[13], t[14], t[15]);
        var positiveDeterminant = matrix.determinant() > 0.0;
        var visible = true;
        if (shape.appearance.primitive) {
            geo = GeometricPrimitives.Get(shape.appearance.primitive, positiveDeterminant);
            visible = shape.appearance.primitive !== 'Empty';
        }
        else {
            geo = new THREE.Geometry();
            var vertices = shape.appearance.geometry.points;
            for (var i = 2; i < vertices.length; i += 3) {
                geo.vertices.push(new THREE.Vector3(vertices[i - 2], vertices[i - 1], vertices[i]));
            }
            if (shape.appearance.geometry.indexed) {
                var indices = shape.appearance.geometry.indices;
                for (var i = 2; i < indices.length; i += 3)
                    geo.faces.push(new THREE.Face3(indices[i - (positiveDeterminant ? 2 : 1)], indices[i - (positiveDeterminant ? 1 : 2)], indices[i]));
            }
            else {
                for (var i = 2, j = 8; j < vertices.length; i += 3, j += 9)
                    geo.faces.push(new THREE.Face3(i - (positiveDeterminant ? 2 : 1), i - (positiveDeterminant ? 1 : 2), i));
            }
            geo.computeFaceNormals();
            if (!positiveDeterminant) {
                for (var i = 0; i < geo.faces.length; ++i)
                    geo.faces[i].normal.multiplyScalar(-1.0);
            }
        }
        var wireFrameMaterial = new THREE.MeshBasicMaterial({
            color: 0x0099ff,
            wireframe: true
        });
        var mesh = new THREE.Mesh(geo, wireFrameMaterial);
        mesh.matrixAutoUpdate = false;
        mesh.applyMatrix(matrix);
        mesh.mName = shape.id;
        mesh.mMaterial = wireFrameMaterial;
        mesh.visible = visible;
        self.previewScene.add(mesh);

        meshes[shape.id] = mesh;

    };

    removePreview = function (shape) {
        self.previewScene.remove(meshes[shape.id]);
        meshes.delete(shape.id);
    };

    //call with node.shape.appearance.transformation
    buildStandardAxes = function (scene, shape, colors, noMode) {
        mat = shape.shape.appearance.transformation;

        var axes = [];

        var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        var center = new THREE.Vector3(0, 0, 0);
        center.applyProjection(m);

        var xDir = new THREE.Vector3(1.0, 0, 0);
        var yDir = new THREE.Vector3(0, 1.0, 0);
        var zDir = new THREE.Vector3(0, 0, 1.0);

        var xScale = new THREE.Vector3(m.elements[0], m.elements[1], m.elements[2]);
        var yScale = new THREE.Vector3(m.elements[4], m.elements[5], m.elements[6]);
        var zScale = new THREE.Vector3(m.elements[8], m.elements[9], m.elements[10]);

        if (xScale.angleTo(xDir) > Math.PI/2) xDir.negate();
        if (yScale.angleTo(yDir) > Math.PI/2) yDir.negate();
        if (zScale.angleTo(zDir) > Math.PI/2) zDir.negate();

        if (noMode || getMode() == "Mode.Local" || getMode() == "Mode.LocalMid") {
            xDir.applyProjection(m);
            yDir.applyProjection(m);
            zDir.applyProjection(m);
            xDir.sub(center);
            yDir.sub(center);
            zDir.sub(center);
        }

        var xArrow = new THREE.ArrowHelper(xDir.normalize(), center, xDir.length(), colors ? colors[0] : 0xFF3030, 0.2, 0.1);
        var yArrow = new THREE.ArrowHelper(yDir.normalize(), center, yDir.length(), colors ? colors[1] : 0x30FF30, 0.2, 0.1);
        var zArrow = new THREE.ArrowHelper(zDir.normalize(), center, zDir.length(), colors ? colors[2] : 0x3030FF, 0.2, 0.1);

        scene.add(xArrow, yArrow, zArrow);
        return [xArrow.id, yArrow.id, zArrow.id];
    };

    appendModeSelector = function (parentDiv) {
        var innerHTML = '<select id="mode_selector">';
        innerHTML += '<option value="Mode.Local">Local</option>';
        innerHTML += '<option value="Mode.LocalMid">LocalMid</option>';
        innerHTML += '<option value="Mode.Global">Global</option>';
        innerHTML += '<option value="Mode.GlobalMid">GlobalMid</option>';
        innerHTML += '</select>'
        parentDiv.innerHTML += innerHTML;
        $('#mode_selector').change(inputChanged);
    };
    setModeSelector = function (target) {
        if (!target.startsWith("Mode.")) target = "Mode." + target;
        var selector = document.getElementById("mode_selector");
        for (i = 0; i < selector.options.length; i++) {
            if (selector.options[i].value == target)
                selector.selectedIndex = i;
        }
    };
    getMode = function () {
        var selector = document.getElementById("mode_selector");
        return selector.options[selector.selectedIndex].value;
    };

    addTags = function (rule, ruleString, indentation) { return renderer.postfixController.appendPostfixString(rule, ruleString, indentation); };
    readTags = function (parentDiv, parentObject) { return renderer.postfixController.applyPostfixes(parentDiv, parentObject); };

    inputChanged = function () { renderer.inputChanged(); };

    // #####################################################################################################################################
    // #####################################################################################################################################
    // ##################################################### RULE-DEFINITIONS ##############################################################
    // #####################################################################################################################################
    // #####################################################################################################################################

    {

        // #################################################################################################################################
        // ################################################## ABSTRACT #####################################################################
        // #################################################################################################################################

        {
            var abstractRule = {};
            abstractRule.type = 'abstract';
            /**
             * @attention: Must set abstractRule.lastRuleString !
             */
            abstractRule.generateRuleString = function () {
                var ruleString = "string generation not implemented yet";
                abstractRule.lastRuleString = ruleString;
                return ruleString;
            };
            abstractRule.getLastRuleString = function () {
                return this.lastRuleString;
            };
            abstractRule.generateShortString = function () {
                return "short not implemented yet";
            };
            abstractRule.applyRule = function (shape) {};
            abstractRule.unapplyRule = function (shape) {};
            abstractRule.appendInputFields = function (parentDiv) {};
            abstractRule.updateRule = function () {};
            abstractRule.additionalUpdates = function() {};
            abstractRule.draggingHelpers = {};
            abstractRule.createHandles = function (scene, shape) {
                this.draggingHelpers.scene = scene;
                var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                this.draggingHelpers.arrowIds = buildStandardAxes(scene, shape, colors, true);
            };
            abstractRule.onMouseOverHandle = function (id) {};
            abstractRule.onMouseNotOverHandle = function () {};
            abstractRule.onHandlePressed = function (id, mouse, intersection, scene, camera, shape) {};
            abstractRule.onHandleDragged = function (mouse) {};
            abstractRule.onHandleReleased = function () {};
            abstractRule.addPreview = addPreview;
            abstractRule.removePreview = removePreview;
            abstractRule.parseCode = function (ruleBuffer) {
                return 0;
            };
            abstractRule.generatesMultipleShapes = false;
            abstractRule.storeCurrentState = function() {};
            abstractRule.setStoredState = function() {};
        }


        // #################################################################################################################################
        // ################################################# CUSTOM ########################################################################
        // #################################################################################################################################

        {
            /*

            config = {
                type: String,                           name of the rule
                mode: bool,                             add mode selector? (local, global, etc.)
                options: [                              list of needed rule parameters
                    {
                        label: String | null,
                        inputType: INPUTTYPE,
                        values: [...] | null
                    },
                    ...
                ]
            }

            inputType - values:
            DROPDOWN - [option1, option2, ...]
            VEC3 - [double, double, double]
            STRING - string
            TAG - string
            RAW - string
            DOUBLE - double
            TAGS - [string, string, ...]

            */
            generateCustomRule = function (config) {

                var customRule = jQuery.extend(true, [], abstractRule);

                customRule.type = config.type;

                customRule.selections = {};
                for (var i = 0; i < config.options.length; i++) {
                    switch (config.options[i].inputType) {
                        case INPUTTYPE.DROPDOWN:
                            customRule.selections[i] = JSON.parse(JSON.stringify(config.options[i].values[0]));
                            break;
                        default:
                            customRule.selections[i] = JSON.parse(JSON.stringify(config.options[i].values));
                            break;
                    }
                }

                customRule.generateRuleString = function () {
                    var ruleString = "new Rules." + config.type + "(";

                    ruleString += customRule.addSelectionsString();

                    if (config.mode && customRule.mode) {
                        ruleString += ', ' + customRule.mode;
                    }
                    ruleString += ")";
                    ruleString = addTags(customRule, ruleString);
                    ruleString += ";";

                    customRule.lastRuleString = ruleString;

                    return ruleString;
                };

                customRule.generateShortString = function () {
                    var ruleString = config.type + " with (";

                    ruleString += customRule.addSelectionsString();

                    if (config.mode && customRule.mode) {
                        ruleString += ', ' + customRule.mode;
                    }
                    ruleString += ")";
                    return ruleString;
                };

                customRule.addSelectionsString = function () {
                    var ruleString = '';
                    for (var i = 0; i < config.options.length; i++) {
                        var current = customRule.selections[i];
                        switch (config.options[i].inputType) {

                            case INPUTTYPE.STRING:
                                ruleString += '"' + current + '"';
                                break;

                            case INPUTTYPE.DOUBLE:
                                ruleString += current;
                                break;

                            case INPUTTYPE.DROPDOWN:
                                ruleString += current;
                                break;

                            case INPUTTYPE.TAG:
                                if (current.tags[0]) {
                                    ruleString += '"' + current.tags[0].tags[0] + '"';
                                }
                                break;

                            case INPUTTYPE.TAGS:
                                if (current.tags[0]) {
                                    for (var k = 0; k < Object.keys(current.tags[0].tags).length; k++) {
                                        ruleString += '"' + current.tags[0].tags[k] + '", ';
                                    }
                                    ruleString = ruleString.slice(0, -2);
                                }
                                break;

                            case INPUTTYPE.RAW:
                                ruleString += current;
                                break;

                            case INPUTTYPE.VEC3:
                                ruleString += 'Vec3(';
                                ruleString += current[0].round() + ', ' + current[1].round() + ', ' + current[2].round();
                                ruleString += ')';
                                break;

                            default:
                                break;

                        }
                        ruleString += ", ";
                    }
                    ruleString = ruleString.slice(0, -2);
                    return ruleString;
                };

                customRule.updateRule = function () {
                    for (var i = 0; i < config.options.length; i++) {
                        switch (config.options[i].inputType) {

                            case INPUTTYPE.STRING:
                            case INPUTTYPE.RAW:
                                var id = "input_field" + i;
                                var input = document.getElementById(id);
                                customRule.selections[i] = input.value;
                                break;

                            case INPUTTYPE.DOUBLE:
                                var id = "input_field" + i;
                                var input = document.getElementById(id);
                                customRule.selections[i] = parseFloat(input.value);
                                break;

                            case INPUTTYPE.DROPDOWN:
                                var id = "dropdown" + i;
                                var selector = document.getElementById(id);
                                customRule.selections[i] = selector.value;
                                break;

                            case INPUTTYPE.TAG:
                                // TODO: read tags via postfix controller
                                break;

                            case INPUTTYPE.TAGS:
                                // TODO: read tags via postfix controller
                                break;

                            case INPUTTYPE.VEC3:
                                var id = "vec3_" + i + "_elem0";
                                var input = document.getElementById(id);
                                customRule.selections[i][0] = parseFloat(input.value);
                                id = "vec3_" + i + "_elem1";
                                var input = document.getElementById(id);
                                customRule.selections[i][1] = parseFloat(input.value);
                                id = "vec3_" + i + "_elem2";
                                var input = document.getElementById(id);
                                customRule.selections[i][2] = parseFloat(input.value);
                                break;

                            default:
                                break;

                        }
                    }

                    if (config.mode) {
                        customRule.mode = getMode();
                    }

                    customRule.additionalUpdates();
                };

                customRule.additionalUpdates = function() { };

                customRule.afterInputCreation = function (parentDiv) { };

                customRule.onselectionChange = inputChanged;

                customRule.appendInputFields = function (parentDiv, empty /* dont fill input with current values */) {
                    for (var i = 0; i < config.options.length; i++) {
                        var current = config.options[i];

                        if (current.label != null && current.inputType != INPUTTYPE.TAG && current.inputType != INPUTTYPE.TAGS) {
                            var label = document.createElement('span');
                            label.id = 'label' + i;
                            label.innerHTML = current.label + ': ';
                            parentDiv.appendChild(label);
                        }

                        // build input
                        switch (current.inputType) {

                            case INPUTTYPE.STRING:
                            case INPUTTYPE.DOUBLE:
                            case INPUTTYPE.RAW:
                                var id = "input_field" + i;
                                var input = document.createElement("input");
                                input.setAttribute('type', 'text');
                                input.setAttribute('id', id);
                                parentDiv.appendChild(input);
                                break;

                            case INPUTTYPE.DROPDOWN:
                                var id = "dropdown" + i;
                                var innerHTML = '<select id=' + id + '>';
                                for (var j = 0; j < current.values.length; j++) {
                                    innerHTML += '<option vaule ="' + current.values[j] + '">' + current.values[j] + '</options>';
                                }
                                innerHTML += '</select>'
                                parentDiv.innerHTML += innerHTML;
                                break;

                            case INPUTTYPE.TAG:
                                if (!empty && customRule.selections[i]) var settings = customRule.selections[i]
                                else var settings = null;
                                renderer.postfixController.addPostfix(parentDiv, settings, current.label, false, customRule.onselectionChange);
                                break;

                            case INPUTTYPE.TAGS:
                                if (!empty && customRule.selections[i]) var settings = customRule.selections[i]
                                else var settings = null;
                                renderer.postfixController.addPostfix(parentDiv, settings, current.label, false, customRule.onselectionChange());
                                break;

                            case INPUTTYPE.VEC3:
                                var id = "vec3_" + i + "_elem0";
                                var input = document.createElement("input");
                                input.setAttribute('type', 'text');
                                input.setAttribute('id', id);
                                parentDiv.appendChild(input);
                                id = "vec3_" + i + "_elem1";
                                input = document.createElement("input");
                                input.setAttribute('type', 'text');
                                input.setAttribute('id', id);
                                parentDiv.appendChild(input);
                                id = "vec3_" + i + "_elem2";
                                input = document.createElement("input");
                                input.setAttribute('type', 'text');
                                input.setAttribute('id', id);
                                parentDiv.appendChild(input);
                                break;

                            default:
                                break;

                        }

                    }

                    if (config.mode) {
                        appendModeSelector(parentDiv);
                        if (!empty) if (customRule.mode) setModeSelector(customRule.mode);
                        else setModeSelector("Local");
                    }

                    for (var i = 0; i < config.options.length; i++) {
                        var current = config.options[i];

                        // add listeners
                        switch (current.inputType) {

                            case INPUTTYPE.STRING:
                            case INPUTTYPE.DOUBLE:
                            case INPUTTYPE.RAW:
                                var id = "input_field" + i;
                                input = document.getElementById(id);
                                input.addEventListener("change", function () { customRule.onselectionChange() });
                                break;

                            case INPUTTYPE.DROPDOWN:
                                var id = "dropdown" + i;
                                var selector = document.getElementById(id);
                                selector.addEventListener("change", function () { customRule.onselectionChange() });
                                break;

                            case INPUTTYPE.TAG:
                                break;

                            case INPUTTYPE.TAGS:
                                break;

                            case INPUTTYPE.VEC3:
                                var id = "vec3_" + i + "_elem0";
                                input = document.getElementById(id);
                                input.addEventListener("change", function () { customRule.onselectionChange() });
                                id = "vec3_" + i + "_elem1";
                                input = document.getElementById(id);
                                input.addEventListener("change", function () { customRule.onselectionChange() });
                                id = "vec3_" + i + "_elem2";
                                input = document.getElementById(id);
                                input.addEventListener("change", function () { customRule.onselectionChange() });
                                break;

                            default:
                                break;

                        }

                        // fill values
                        switch (current.inputType) {
                            case INPUTTYPE.STRING:
                            case INPUTTYPE.DOUBLE:
                            case INPUTTYPE.RAW:
                                var id = "input_field" + i;
                                input = document.getElementById(id);
                                if (!empty) {
                                    input.value = customRule.selections[i];
                                } else if (current.values != null) {
                                    if (isFunction(current.values)) {
                                        input.value = current.values();
                                    } else {
                                        input.value = current.values;
                                    }
                                }
                                break;

                            case INPUTTYPE.DROPDOWN:
                                var id = "dropdown" + i;
                                if (!empty) {
                                    var selector = document.getElementById(id);
                                    for (j = 0; j < selector.options.length; j++) {
                                        if (selector.options[j].label == customRule.selections[i])
                                            selector.selectedIndex = j;
                                    }
                                }
                                break;
                            case INPUTTYPE.TAG:
                            case INPUTTYPE.TAGS:
                                break;
                            case INPUTTYPE.VEC3:
                                var id = "vec3_" + i + "_elem0";
                                input0 = document.getElementById(id);
                                id = "vec3_" + i + "_elem1";
                                input1 = document.getElementById(id);
                                id = "vec3_" + i + "_elem2";
                                input2 = document.getElementById(id);
                                if (!empty) {
                                    input0.value = customRule.selections[i][0];
                                    input1.value = customRule.selections[i][1];
                                    input2.value = customRule.selections[i][2];
                                } else if (current.values != null) {
                                    if (isFunction(current.values)) {
                                        input0.value = current.values()[0];
                                        input1.value = current.values()[1];
                                        input2.value = current.values()[2];
                                    } else {
                                        input0.value = current.values[0];
                                        input1.value = current.values[1];
                                        input2.value = current.values[2];
                                    }
                                }
                                break;
                            default:
                                break;

                        }
                    }

                    customRule.afterInputCreation(parentDiv);

                    customRule.onselectionChange();
                };

                customRule.parseCode = function (ruleBuffer) {
                    customRule.selections = [];

                    var counter = 0;
                    if (ruleBuffer[0].Text == config.type) counter += 2;

                    var optionIndex = 0;
                    var minus = false;
                    var current = null;
                    // parse input variables
                    while (optionIndex < config.options.length && counter < ruleBuffer.length) {
                        current = ruleBuffer[counter];

                        switch (config.options[optionIndex].inputType) {

                            case INPUTTYPE.TAG:
                            case INPUTTYPE.STRING:
                                if (current.RawKind == 8511) {
                                    customRule.selections.push(current.Text.substring(1, (current.Text.length - 1)));
                                    optionIndex += 1;
                                }
                                counter += 1;
                                break;

                            case INPUTTYPE.RAW:
                                if (current.Text == '-' && current.RawKind == 8202) {
                                    minus = true;
                                } else if (current.RawKind == 8509 ||
                                    current.RawKind == 8511 ||
                                    current.RawKind == 8323) {
                                    if (minus) customRule.selections.push('-' + current.Text);
                                    else customRule.selections.push(current.Text);
                                    minus = false;
                                    optionIndex += 1;
                                }
                                counter += 1;
                                break;

                            case INPUTTYPE.DROPDOWN:
                                if (current.RawKind == 8508) {
                                    if (ruleBuffer[counter + 1].Text == '.' && ruleBuffer[counter + 2].RawKind == 8508) {
                                        customRule.selections.push(current.Text + '.' + ruleBuffer[counter + 2].Text);
                                        counter += 3;
                                    } else {
                                        customRule.selections.push(current.Text);
                                        counter += 1;
                                    }
                                    optionIndex += 1;
                                } else {
                                    counter += 1;
                                }
                                break;

                            case INPUTTYPE.DOUBLE:
                                if (current.Text == '-' && current.RawKind == 8202) {
                                    minus = true;
                                } else if (current.RawKind == 8509) {
                                    if (minus) customRule.selections.push(-1 * parseFloat(current.Text));
                                    else customRule.selections.push(parseFloat(current.Text));
                                    minus = false;
                                    optionIndex += 1;
                                }
                                counter += 1;
                                break;

                            case INPUTTYPE.TAGS:        // TODO: NOT CORRECT!!!! ONLY WORKS AS LAST INPUT PARAMETER
                                var taglist = []
                                while (ruleBuffer[counter].ValueText != ')') {
                                    if (ruleBuffer[counter] != ',') taglist.push(ruleBuffer[counter]);
                                    counter++;
                                }
                                break;

                            case INPUTTYPE.VEC3:
                                if (current.Text == '-' && current.RawKind == 8202) {
                                    minus = true;
                                } else if (current.Text == "Vec3" && current.RawKind == 8508) {
                                    var vec3 = [];
                                } else if (current.RawKind == 8509) {
                                    if (minus) vec3.push(-1 * parseFloat(current.Text))
                                    else vec3.push(parseFloat(current.Text))
                                    minus = false;
                                } else if (current.Text == ")" && current.RawKind == 8201) {
                                    this.selections.push(vec3);
                                    optionIndex += 1;
                                }
                                counter += 1;
                                break;

                            default:
                                counter += 1;
                                break;

                        }
                    }

                    return counter;
                };

                customRule.storeCurrentState = function () {
                    customRule.storedState = JSON.parse(JSON.stringify(customRule.selections));
                    if (config.mode) customRule.storedMode = customRule.mode;
                    customRule.storedPostfixes = JSON.parse(JSON.stringify(customRule.postfixes));
                };

                customRule.setStoredState = function () {
                    for (var i = 0; i < config.options.length; i++) {
                        switch (config.options[i].inputType) {

                            case INPUTTYPE.STRING:
                            case INPUTTYPE.DOUBLE:
                            case INPUTTYPE.RAW:
                                var id = "input_field" + i;
                                var input = document.getElementById(id);
                                input.value = customRule.storedState[i];
                                break;

                            case INPUTTYPE.DROPDOWN:
                                var id = "dropdown" + i;
                                var input = document.getElementById(id);
                                input.value = customRule.storedState[i];
                                break;

                            case INPUTTYPE.TAG:
                                // TODO: set tags
                                break;

                            case INPUTTYPE.TAGS:
                                // TODO: set tags
                                break;

                            case INPUTTYPE.VEC3:
                                var id = "vec3_" + i + "_elem0";
                                input = document.getElementById(id);
                                input.value = customRule.storedState[i][0];
                                id = "vec3_" + i + "_elem1";
                                input = document.getElementById(id);
                                input.value = customRule.storedState[i][1];
                                id = "vec3_" + i + "_elem2";
                                input = document.getElementById(id);
                                input.value = customRule.storedState[i][2];
                                break;

                            default:
                                break;

                        }

                    }

                    if (config.mode && customRule.storedMode) {
                        setModeSelector(customRule.storedMode)
                    }

                    customRule.postfixes = JSON.parse(JSON.stringify(customRule.storedPostfixes));
                };

                return customRule;

            }
        }

        // #################################################################################################################################
        // ############################################ TRANSLATION ########################################################################
        // #################################################################################################################################

        {
            self.translateConfig = {
                type: 'Translate',
                mode: true,
                options: [
                    {
                        label: 'Vector',
                        inputType: INPUTTYPE.VEC3,
                        values: [0,0,0]
                    }
                ]
            }

            generateTranslationRule = function () {

                var translation = generateCustomRule(self.translateConfig);

                translation.applyRule = function (shape) {
                    var matrix = new THREE.Matrix4();
                    matrix.makeTranslation(parseFloat(translation.selections[0][0]), parseFloat(translation.selections[0][1]), parseFloat(translation.selections[0][2]));
                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat).transpose();
                    if (translation.mode == "Mode.Local" || translation.mode == "Mode.LocalMid") m.premultiply(matrix);
                    if (translation.mode == "Mode.Global" || translation.mode == "Mode.GlobalMid") m.multiply(matrix);
                    shape.appearance.transformation = m.transpose().toArray();
                };
                translation.unapplyRule = function (shape) {
                    var matrix = new THREE.Matrix4();
                    matrix.makeTranslation(-parseFloat(translation.selections[0][0]), -parseFloat(translation.selections[0][1]), -parseFloat(translation.selections[0][2]));
                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat).transpose();
                    if (translation.mode == "Mode.Local" || translation.mode == "Mode.LocalMid") m.premultiply(matrix);
                    if (translation.mode == "Mode.Global" || translation.mode == "Mode.GlobalMid") m.multiply(matrix);
                    shape.appearance.transformation = m.transpose().toArray();
                };
                translation.draggingHelpers = {
                    ids: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    activeHandle: null,
                    overHandle: false,
                    startPos: {
                        x: 0,
                        y: 0
                    },
                    startValues: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    diffWorld: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    diffScreen: {
                        x: 0,
                        y: 0
                    }
                };
                translation.createHandles = function (scene, shape) {
                    translation.draggingHelpers.scene = scene;

                    var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                    var toSwitch = null;
                    if (translation.draggingHelpers.activeHandle) toSwitch = translation.draggingHelpers.activeHandle;
                    else if (translation.draggingHelpers.overHandle) toSwitch = translation.draggingHelpers.overHandle;
                    switch (toSwitch) {
                        case null:
                            break;
                        case 'x':
                            colors[0] = 0xFF0000;
                            break;
                        case 'y':
                            colors[1] = 0x00FF00;
                            break;
                        case 'z':
                            colors[2] = 0x0066FF;
                            break;
                        default:
                            break;
                    }

                    var ids = buildStandardAxes(scene, shape, colors);
                    translation.draggingHelpers.ids.x = ids[0];
                    translation.draggingHelpers.ids.y = ids[1];
                    translation.draggingHelpers.ids.z = ids[2];
                };
                translation.onMouseOverHandle = function (id) {
                    oldHandle = translation.draggingHelpers.overHandle;
                    if (translation.draggingHelpers.ids.x <= id && id <= translation.draggingHelpers.ids.x + 2) {
                        translation.draggingHelpers.overHandle = 'x';
                    }
                    if (translation.draggingHelpers.ids.y <= id && id <= translation.draggingHelpers.ids.y + 2) {
                        translation.draggingHelpers.overHandle = 'y';
                    }
                    if (translation.draggingHelpers.ids.z <= id && id <= translation.draggingHelpers.ids.z + 2) {
                        translation.draggingHelpers.overHandle = 'z';
                    }
                    if (translation.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                translation.onMouseNotOverHandle = function () {
                    oldHandle = translation.draggingHelpers.overHandle;
                    translation.draggingHelpers.overHandle = null;
                    if (translation.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                translation.onHandlePressed = function (id, mouse, intersection, scene, camera, shape) {
                    var arrowPos = scene.getObjectById(id).parent.position;
                    var initStart = arrowPos.clone();
                    var initEnd = intersection.clone();
                    var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                    var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                    translation.draggingHelpers.segment = {
                        start: start,
                        end: end
                    };

                    translation.draggingHelpers.shape = shape;

                    translation.draggingHelpers.startValues.x = parseFloat(document.getElementById("vec3_0_elem0").value);
                    translation.draggingHelpers.startValues.y = parseFloat(document.getElementById("vec3_0_elem1").value);
                    translation.draggingHelpers.startValues.z = parseFloat(document.getElementById("vec3_0_elem2").value);
                    translation.draggingHelpers.cam = camera;
                    translation.draggingHelpers.intersection = intersection;
                    translation.draggingHelpers.arrowPos = arrowPos;

                    if (translation.draggingHelpers.ids.x <= id && id <= translation.draggingHelpers.ids.x + 2) {
                        translation.draggingHelpers.activeHandle = 'x';
                    }
                    if (translation.draggingHelpers.ids.y <= id && id <= translation.draggingHelpers.ids.y + 2) {
                        translation.draggingHelpers.activeHandle = 'y';
                    }
                    if (translation.draggingHelpers.ids.z <= id && id <= translation.draggingHelpers.ids.z + 2) {
                        translation.draggingHelpers.activeHandle = 'z';
                    }
                };
                translation.onHandleDragged = function (mouse) {
                    var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                    mousePoint.unproject(translation.draggingHelpers.cam);
                    var mouseRay = new THREE.Ray(translation.draggingHelpers.cam.position, mousePoint.sub(translation.draggingHelpers.cam.position).normalize());

                    var targetPoint = new THREE.Vector3();
                    mouseRay.distanceSqToSegment(translation.draggingHelpers.segment.start,
                        translation.draggingHelpers.segment.end,
                        null,
                        targetPoint);

                    var diff = targetPoint.sub(translation.draggingHelpers.intersection);
                    var length = diff.length();
                    var direction = translation.draggingHelpers.intersection.clone().sub(translation.draggingHelpers.arrowPos);
                    var angle = diff.normalize().angleTo(direction.normalize());
                    if (angle > (0.5 * Math.PI)) length *= -1;

                    switch (translation.draggingHelpers.activeHandle) {
                        case 'x':
                            document.getElementById("vec3_0_elem0").value = '' + (translation.draggingHelpers.startValues.x + length).round();
                            break;
                        case 'y':
                            document.getElementById("vec3_0_elem1").value = '' + (translation.draggingHelpers.startValues.y + length).round();
                            break;
                        case 'z':
                            document.getElementById("vec3_0_elem2").value = '' + (translation.draggingHelpers.startValues.z + length).round();
                            break;
                    }
                    inputChanged();
                };
                translation.onHandleReleased = function () {
                    oldHandle = translation.draggingHelpers.activeHandle;
                    translation.draggingHelpers.activeHandle = null;
                    if (translation.draggingHelpers.activeHandle != oldHandle) inputChanged();
                };

                return translation;
            }
        }


        // #################################################################################################################################
        // ################################################## SCALE ########################################################################
        // #################################################################################################################################

        {
            self.scaleConfig = {
                type: 'Scale',
                mode: true,
                options: [
                    {
                        label: 'Vector',
                        inputType: INPUTTYPE.VEC3,
                        values: [1, 1, 1]
                    }
                ]
            };

            generateScaleRule = function () {

                var scale = generateCustomRule(self.scaleConfig);

                scale.applyRule = function (shape) {
                    var matrix = new THREE.Matrix4();
                    matrix.makeScale(parseFloat(scale.selections[0][0]), parseFloat(scale.selections[0][1]), parseFloat(scale.selections[0][2]));
                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat).transpose();
                    if (scale.mode == "Mode.Local" || scale.mode == "Mode.LocalMid") m.multiply(matrix);
                    if (scale.mode == "Mode.Global" || scale.mode == "Mode.GlobalMid") m.premultiply(matrix);
                    shape.appearance.transformation = m.transpose().toArray();
                };
                scale.unapplyRule = function (shape) {
                    var matrix = new THREE.Matrix4();
                    matrix.makeScale(1 / parseFloat(scale.selections[0][0]), 1 / parseFloat(scale.selections[0][1]), 1 / parseFloat(scale.selections[0][2]));
                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat).transpose();
                    if (scale.mode == "Mode.Local" || scale.mode == "Mode.LocalMid") m.multiply(matrix);
                    if (scale.mode == "Mode.Global" || scale.mode == "Mode.GlobalMid") m.premultiply(matrix);
                    shape.appearance.transformation = m.transpose().toArray();
                };
                scale.draggingHelpers = {
                    ids: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    activeHandle: null,
                    overHandle: false,
                    startPos: {
                        x: 0,
                        y: 0
                    },
                    startValues: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    diffWorld: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    diffScreen: {
                        x: 0,
                        y: 0
                    }
                };
                scale.createHandles = function (scene, shape) {
                    scale.draggingHelpers.scene = scene;

                    var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                    var toSwitch = null;
                    if (scale.draggingHelpers.activeHandle) toSwitch = scale.draggingHelpers.activeHandle;
                    else if (scale.draggingHelpers.overHandle) toSwitch = scale.draggingHelpers.overHandle;
                    switch (toSwitch) {
                        case null:
                            break;
                        case 'x':
                            colors[0] = 0xFF0000;
                            break;
                        case 'y':
                            colors[1] = 0x00FF00;
                            break;
                        case 'z':
                            colors[2] = 0x0066FF;
                            break;
                        default:
                            break;
                    }

                    var m = shape.shape.appearance.transformation;
                    var xDir = new THREE.Vector3(m[0], m[1], m[2]);
                    var yDir = new THREE.Vector3(m[4], m[5], m[6]);
                    var zDir = new THREE.Vector3(m[8], m[9], m[10]);
                    scale.draggingHelpers.sizeX = xDir.length();
                    scale.draggingHelpers.sizeY = yDir.length();
                    scale.draggingHelpers.sizeZ = zDir.length();

                    var ids = buildStandardAxes(scene, shape, colors);
                    scale.draggingHelpers.ids.x = ids[0];
                    scale.draggingHelpers.ids.y = ids[1];
                    scale.draggingHelpers.ids.z = ids[2];
                };
                scale.onMouseOverHandle = function (id) {
                    oldHandle = this.draggingHelpers.overHandle;
                    if (scale.draggingHelpers.ids.x <= id && id <= scale.draggingHelpers.ids.x + 2) {
                        scale.draggingHelpers.overHandle = 'x';
                    }
                    if (scale.draggingHelpers.ids.y <= id && id <= scale.draggingHelpers.ids.y + 2) {
                        scale.draggingHelpers.overHandle = 'y';
                    }
                    if (scale.draggingHelpers.ids.z <= id && id <= scale.draggingHelpers.ids.z + 2) {
                        scale.draggingHelpers.overHandle = 'z';
                    }
                    if (scale.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                scale.onMouseNotOverHandle = function () {
                    oldHandle = scale.draggingHelpers.overHandle;
                    scale.draggingHelpers.overHandle = null;
                    if (scale.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                scale.onHandlePressed = function (id, mouse, intersection, scene, camera) {
                    var arrowPos = scene.getObjectById(id).parent.position;
                    var initStart = arrowPos.clone();
                    var initEnd = intersection.clone();
                    var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                    var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                    scale.draggingHelpers.segment = {
                        start: start,
                        end: end
                    }

                    scale.draggingHelpers.startValues.x = parseFloat(document.getElementById("vec3_0_elem0").value);
                    scale.draggingHelpers.startValues.y = parseFloat(document.getElementById("vec3_0_elem1").value);
                    scale.draggingHelpers.startValues.z = parseFloat(document.getElementById("vec3_0_elem2").value);
                    scale.draggingHelpers.cam = camera;
                    scale.draggingHelpers.intersection = intersection;
                    scale.draggingHelpers.arrowPos = arrowPos;

                    scale.draggingHelpers.startSizeX = scale.draggingHelpers.sizeX;
                    scale.draggingHelpers.startSizeY = scale.draggingHelpers.sizeY;
                    scale.draggingHelpers.startSizeZ = scale.draggingHelpers.sizeZ;

                    if (scale.draggingHelpers.ids.x <= id && id <= scale.draggingHelpers.ids.x + 2) {
                        scale.draggingHelpers.activeHandle = 'x';
                    }
                    if (scale.draggingHelpers.ids.y <= id && id <= scale.draggingHelpers.ids.y + 2) {
                        scale.draggingHelpers.activeHandle = 'y';
                    }
                    if (scale.draggingHelpers.ids.z <= id && id <= scale.draggingHelpers.ids.z + 2) {
                        scale.draggingHelpers.activeHandle = 'z';
                    }
                };
                scale.onHandleDragged = function (mouse) {
                    var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                    mousePoint.unproject(this.draggingHelpers.cam);
                    var mouseRay = new THREE.Ray(scale.draggingHelpers.cam.position, mousePoint.sub(scale.draggingHelpers.cam.position).normalize());

                    var targetPoint = new THREE.Vector3();
                    mouseRay.distanceSqToSegment(scale.draggingHelpers.segment.start,
                        this.draggingHelpers.segment.end,
                        null,
                        targetPoint);

                    var diff = targetPoint.sub(scale.draggingHelpers.intersection);
                    var length = diff.length();
                    var direction = scale.draggingHelpers.intersection.clone().sub(scale.draggingHelpers.arrowPos);
                    var angle = diff.normalize().angleTo(direction.normalize());
                    if (angle > (0.5 * Math.PI)) length *= -1;

                    switch (this.draggingHelpers.activeHandle) {
                        case 'x':
                            var scaleFactor = this.draggingHelpers.startSizeX * scale.draggingHelpers.startValues.x + length;
                            scaleFactor = scaleFactor / scale.draggingHelpers.startSizeX;
                            document.getElementById("vec3_0_elem0").value = scaleFactor.round();
                            break;
                        case 'y':
                            var scaleFactor = this.draggingHelpers.startSizeY * scale.draggingHelpers.startValues.y + length;
                            scaleFactor = scaleFactor / scale.draggingHelpers.startSizeY;
                            document.getElementById("vec3_0_elem1").value = scaleFactor.round();
                            break;
                        case 'z':
                            var scaleFactor = this.draggingHelpers.startSizeZ * scale.draggingHelpers.startValues.z + length;
                            scaleFactor = scaleFactor / scale.draggingHelpers.startSizeZ;
                            document.getElementById("vec3_0_elem2").value = scaleFactor.round();
                            break;
                    }
                    inputChanged();
                };
                scale.onHandleReleased = function () {
                    oldHandle = scale.draggingHelpers.activeHandle;
                    scale.draggingHelpers.activeHandle = null;
                    if (scale.draggingHelpers.activeHandle != oldHandle) inputChanged();
                };

                return scale;
            }
        }


        // #################################################################################################################################
        // ################################################## GROW #########################################################################
        // #################################################################################################################################

        {
            self.growConfig = {
                type: 'Grow',
                mode: true,
                options: [
                    {
                        label: 'Vector',
                        inputType: INPUTTYPE.VEC3,
                        values: [0, 0, 0]
                    }
                ]
            }

            generateGrowRule = function () {

                var grow = generateCustomRule(self.growConfig);

                grow.applyRule = function (shape) {
                    var transform = shape.appearance.transformation;
                    var xDir = new THREE.Vector3(transform[0], transform[1], transform[2]);
                    var yDir = new THREE.Vector3(transform[4], transform[5], transform[6]);
                    var zDir = new THREE.Vector3(transform[8], transform[9], transform[10]);
                    var sizeX = xDir.length();
                    var sizeY = yDir.length();
                    var sizeZ = zDir.length();
                    var scaleX = 1 + parseFloat(grow.selections[0][0]) / sizeX;
                    var scaleY = 1 + parseFloat(grow.selections[0][1]) / sizeY;
                    var scaleZ = 1 + parseFloat(grow.selections[0][2]) / sizeZ;

                    var matrix = new THREE.Matrix4();
                    matrix.makeScale(scaleX, scaleY, scaleZ);
                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat).transpose();
                    if (grow.mode == "Mode.Local" || grow.mode == "Mode.LocalMid") m.premultiply(matrix);
                    if (grow.mode == "Mode.Global" || grow.mode == "Mode.GlobalMid") m.multiply(matrix);
                    shape.appearance.transformation = m.transpose().toArray();
                };
                grow.unapplyRule = function (shape) {
                    var transform = shape.appearance.transformation;
                    var xDir = new THREE.Vector3(transform[0], transform[1], transform[2]);
                    var yDir = new THREE.Vector3(transform[4], transform[5], transform[6]);
                    var zDir = new THREE.Vector3(transform[8], transform[9], transform[10]);
                    var sizeX = xDir.length();
                    var sizeY = yDir.length();
                    var sizeZ = zDir.length();
                    var scaleX = sizeX / (sizeX - parseFloat(grow.selections[0][0]));
                    var scaleY = sizeY / (sizeY - parseFloat(grow.selections[0][1]));
                    var scaleZ = sizeZ / (sizeZ - parseFloat(grow.selections[0][2]));

                    var matrix = new THREE.Matrix4();
                    matrix.makeScale(1 / scaleX, 1 / scaleY, 1 / scaleZ);
                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat).transpose();
                    if (grow.mode == "Mode.Local" || grow.mode == "Mode.LocalMid") m.premultiply(matrix);
                    if (grow.mode == "Mode.Global" || grow.mode == "Mode.GlobalMid") m.multiply(matrix);
                    shape.appearance.transformation = m.transpose().toArray();
                };
                grow.draggingHelpers = {
                    ids: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    activeHandle: null,
                    overHandle: false,
                    startPos: {
                        x: 0,
                        y: 0
                    },
                    startValues: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    diffWorld: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    diffScreen: {
                        x: 0,
                        y: 0
                    }
                };
                grow.createHandles = function (scene, shape) {
                    grow.draggingHelpers.scene = scene;

                    var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                    var toSwitch = null;
                    if (grow.draggingHelpers.activeHandle) toSwitch = grow.draggingHelpers.activeHandle;
                    else if (grow.draggingHelpers.overHandle) toSwitch = grow.draggingHelpers.overHandle;
                    switch (toSwitch) {
                        case null:
                            break;
                        case 'x':
                            colors[0] = 0xFF0000;
                            break;
                        case 'y':
                            colors[1] = 0x00FF00;
                            break;
                        case 'z':
                            colors[2] = 0x0066FF;
                            break;
                        default:
                            break;
                    }

                    var m = shape.shape.appearance.transformation;
                    var xDir = new THREE.Vector3(m[0], m[1], m[2]);
                    var yDir = new THREE.Vector3(m[4], m[5], m[6]);
                    var zDir = new THREE.Vector3(m[8], m[9], m[10]);
                    grow.draggingHelpers.sizeX = xDir.length();
                    grow.draggingHelpers.sizeY = yDir.length();
                    grow.draggingHelpers.sizeZ = zDir.length();

                    var ids = buildStandardAxes(scene, shape, colors);
                    grow.draggingHelpers.ids.x = ids[0];
                    grow.draggingHelpers.ids.y = ids[1];
                    grow.draggingHelpers.ids.z = ids[2];
                };
                grow.onMouseOverHandle = function (id) {
                    oldHandle = grow.draggingHelpers.overHandle;
                    if (grow.draggingHelpers.ids.x <= id && id <= grow.draggingHelpers.ids.x + 2) {
                        grow.draggingHelpers.overHandle = 'x';
                    }
                    if (grow.draggingHelpers.ids.y <= id && id <= grow.draggingHelpers.ids.y + 2) {
                        grow.draggingHelpers.overHandle = 'y';
                    }
                    if (grow.draggingHelpers.ids.z <= id && id <= grow.draggingHelpers.ids.z + 2) {
                        grow.draggingHelpers.overHandle = 'z';
                    }
                    if (grow.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                grow.onMouseNotOverHandle = function () {
                    oldHandle = grow.draggingHelpers.overHandle;
                    grow.draggingHelpers.overHandle = null;
                    if (grow.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                grow.onHandlePressed = function (id, mouse, intersection, scene, camera) {
                    var arrowPos = scene.getObjectById(id).parent.position;
                    var initStart = arrowPos.clone();
                    var initEnd = intersection.clone();
                    var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                    var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                    grow.draggingHelpers.segment = {
                        start: start,
                        end: end
                    }

                    grow.draggingHelpers.startValues.x = parseFloat(document.getElementById("vec3_0_elem0").value);
                    grow.draggingHelpers.startValues.y = parseFloat(document.getElementById("vec3_0_elem1").value);
                    grow.draggingHelpers.startValues.z = parseFloat(document.getElementById("vec3_0_elem2").value);
                    grow.draggingHelpers.cam = camera;
                    grow.draggingHelpers.intersection = intersection;
                    grow.draggingHelpers.arrowPos = arrowPos;

                    grow.draggingHelpers.startSizeX = grow.draggingHelpers.sizeX;
                    grow.draggingHelpers.startSizeY = grow.draggingHelpers.sizeY;
                    grow.draggingHelpers.startSizeZ = grow.draggingHelpers.sizeZ;

                    if (grow.draggingHelpers.ids.x <= id && id <= grow.draggingHelpers.ids.x + 2) {
                        grow.draggingHelpers.activeHandle = 'x';
                    }
                    if (grow.draggingHelpers.ids.y <= id && id <= grow.draggingHelpers.ids.y + 2) {
                        grow.draggingHelpers.activeHandle = 'y';
                    }
                    if (grow.draggingHelpers.ids.z <= id && id <= grow.draggingHelpers.ids.z + 2) {
                        grow.draggingHelpers.activeHandle = 'z';
                    }
                };
                grow.onHandleDragged = function (mouse) {
                    var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                    mousePoint.unproject(grow.draggingHelpers.cam);
                    var mouseRay = new THREE.Ray(grow.draggingHelpers.cam.position, mousePoint.sub(grow.draggingHelpers.cam.position).normalize());

                    var targetPoint = new THREE.Vector3();
                    mouseRay.distanceSqToSegment(grow.draggingHelpers.segment.start,
                        grow.draggingHelpers.segment.end,
                        null,
                        targetPoint);

                    var diff = targetPoint.sub(grow.draggingHelpers.intersection);
                    var length = diff.length();
                    var direction = grow.draggingHelpers.intersection.clone().sub(grow.draggingHelpers.arrowPos);
                    var angle = diff.normalize().angleTo(direction.normalize());
                    if (angle > (0.5 * Math.PI)) length *= -1;

                    switch (this.draggingHelpers.activeHandle) {
                        case 'x':
                            var scale = grow.draggingHelpers.startSizeX + length;
                            scale = scale / grow.draggingHelpers.startSizeX;
                            var growFactor = scale * grow.draggingHelpers.sizeX - grow.draggingHelpers.sizeX;
                            document.getElementById("vec3_0_elem0").value = (grow.draggingHelpers.startValues.x + length).round();
                            break;
                        case 'y':
                            var scale = grow.draggingHelpers.startSizeY + length;
                            scale = scale / grow.draggingHelpers.startSizeY;
                            var growFactor = scale * grow.draggingHelpers.sizeY - grow.draggingHelpers.sizeY;
                            document.getElementById("vec3_0_elem1").value = (grow.draggingHelpers.startValues.y + length).round();
                            break;
                        case 'z':
                            var scale = grow.draggingHelpers.startSizeZ + length;
                            scale = scale / grow.draggingHelpers.startSizeZ;
                            var growFactor = scale * grow.draggingHelpers.sizeZ - grow.draggingHelpers.sizeZ;
                            document.getElementById("vec3_0_elem2").value = (grow.draggingHelpers.startValues.z + length).round();
                            break;
                    }
                    inputChanged();
                };
                grow.onHandleReleased = function () {
                    oldHandle = grow.draggingHelpers.activeHandle;
                    grow.draggingHelpers.activeHandle = null;
                    if (grow.draggingHelpers.activeHandle != oldHandle) inputChanged();
                };

                return grow;
            }
        }

        // #################################################################################################################################
        // ################################################## SIZE #########################################################################
        // #################################################################################################################################

        {
            var axes = ["Axis.X", "Axis.Y", "Axis.Z"];
            self.sizeConfig = {
                type: 'Size',
                mode: true,
                options: [
                    {
                        label: 'Axis',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: axes
                    },
                    {
                        label: 'Size',
                        inputType: INPUTTYPE.DOUBLE,
                        values: null
                    }
                ]
            };

            generateSizeRule = function () {

                var sizeRule = generateCustomRule(self.sizeConfig);

                sizeRule.initialSize = null;

                sizeRule.applyRule = function (shape) {
                    var matrix = new THREE.Matrix4();

                    var scale = sizeRule.selections[1] / sizeRule.initialSize || 1;
                    switch (this.selections[0]) {
                        case 'Axis.X':
                            matrix.makeScale(scale, 1, 1);
                            break;
                        case 'Axis.Y':
                            matrix.makeScale(1, scale, 1);
                            break;
                        case 'Axis.Z':
                            matrix.makeScale(1, 1, scale);
                            break;
                        default:
                            break;
                    }

                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat).transpose();
                    if (this.mode == "Mode.Local" || this.mode == "Mode.LocalMid") m.multiply(matrix);
                    if (this.mode == "Mode.Global" || this.mode == "Mode.GlobalMid") m.premultiply(matrix);
                    shape.appearance.transformation = m.transpose().toArray();
                };
                sizeRule.unapplyRule = function (shape) {
                    var matrix = new THREE.Matrix4();

                    var scale = sizeRule.initialSize / sizeRule.selections[1] || 1;
                    switch (this.selections[0]) {
                        case 'Axis.X':
                            matrix.makeScale(scale, 1, 1);
                            break;
                        case 'Axis.Y':
                            matrix.makeScale(1, scale, 1);
                            break;
                        case 'Axis.Z':
                            matrix.makeScale(1, 1, scale);
                            break;
                        default:
                            break;
                    }

                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat).transpose();
                    if (this.mode == "Mode.Local" || this.mode == "Mode.LocalMid") m.multiply(matrix);
                    if (this.mode == "Mode.Global" || this.mode == "Mode.GlobalMid") m.premultiply(matrix);
                    shape.appearance.transformation = m.transpose().toArray();
                };
                sizeRule.createHandles = function (scene, shape) {

                    // necessary calculations
                    var m = shape.shape.appearance.transformation;
                    var selector = document.getElementById('dropdown0');
                    var selection = selector[selector.selectedIndex].label;

                    if (!this.initialSizeX) {
                        var dir = new THREE.Vector3(m[0], m[1], m[2]);
                        this.initialSizeX = dir.length();
                    }
                    if (!this.initialSizeY) {
                        var dir = new THREE.Vector3(m[4], m[5], m[6]);
                        this.initialSizeY = dir.length();
                    }
                    if (!this.initialSizeZ) {
                        var dir = new THREE.Vector3(m[8], m[9], m[10]);
                        this.initialSizeZ = dir.length();
                    }

                    if (!this.initialSize) {
                        if (this.selections[0] == 'Axis.X') {
                            this.initialSize = sizeRule.initialSizeX;
                        } else if (this.selections[0] == 'Axis.Y') {
                            this.initialSize = sizeRule.initialSizeY;
                        } else {
                            this.initialSize = sizeRule.initialSizeZ;
                        }
                    }

                    if (!this.selections[1]) this.selections[1] = this.initialSize;

                    //create handles
                    var basicColors = [0xAA3030, 0x30AA30, 0x3030AA];
                    var highlightColors = [0xFF0000, 0x00FF00, 0x0000FF];

                    mat = shape.shape.appearance.transformation;
                    var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                    center = new THREE.Vector3(0, 0, 0);
                    center.applyProjection(m);

                    var dir, length;
                    switch (this.selections[0]) {
                        case 'Axis.X':
                            dir = new THREE.Vector3(1.0, 0, 0);
                            length = new THREE.Vector3(this.selections[1], 0, 0);
                            break;
                        case 'Axis.Y':
                            dir = new THREE.Vector3(0, 1.0, 0);
                            length = new THREE.Vector3(0, this.selections[1], 0);
                            break;
                        case 'Axis.Z':
                            dir = new THREE.Vector3(0, 0, 1.0);
                            length = new THREE.Vector3(0, 0, this.selections[1]);
                            break;
                        default:
                            break;
                    }

                    center.addScaledVector(length, 0.5);
                    dir.applyProjection(m);
                    dir.sub(center);
                    dir.normalize();

                    if (!this.draggingHelpers.arrowIds) this.draggingHelpers.arrowIds = [];
                    this.draggingHelpers.highlight = (this.draggingHelpers.overHandle || this.draggingHelpers.activeHandle);

                    var oldStartingId = this.draggingHelpers.arrowIds[0] || 0;
                    this.draggingHelpers.arrowIds = [];
                    switch (this.selections[0]) {
                        case 'Axis.X':
                            if (this.draggingHelpers.highlight) color = highlightColors[0];
                            else color = basicColors[0];
                            break;
                        case 'Axis.Y':
                            if (this.draggingHelpers.highlight) color = highlightColors[1];
                            else color = basicColors[1];
                            break;
                        case 'Axis.Z':
                            if (this.draggingHelpers.highlight) color = highlightColors[2];
                            else color = basicColors[2];
                            break;
                        default:
                            break;
                    }

                    var backarrow = new THREE.ArrowHelper(new THREE.Vector3().sub(dir), center, 0.5, color, 0.2, 0.1);
                    var arrow = new THREE.ArrowHelper(dir, center, 0.5, color, 0.2, 0.1);
                    scene.add(arrow);
                    scene.add(backarrow);
                    this.draggingHelpers.arrowIds.push(arrow.id);
                    this.draggingHelpers.arrowIds.push(backarrow.id);

                    this.draggingHelpers.idOffset = this.draggingHelpers.arrowIds[0] - oldStartingId;

                    var input = document.getElementById('input_field1');
                    if (!input.value) input.value = sizeRule.selections[1].round();
                };
                sizeRule.onMouseOverHandle = function (id) {
                    oldHandle = sizeRule.draggingHelpers.overHandle;
                    sizeRule.draggingHelpers.overHandle = true;
                    if (sizeRule.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                sizeRule.onMouseNotOverHandle = function () {
                    oldHandle = sizeRule.draggingHelpers.overHandle;
                    sizeRule.draggingHelpers.overHandle = null;
                    if (sizeRule.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                sizeRule.onHandlePressed = function (id, mouse, intersection, scene, camera) {
                    var arrowPos = scene.getObjectById(id).parent.position;
                    var initStart = arrowPos.clone();
                    var initEnd = intersection.clone();
                    var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                    var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                    sizeRule.draggingHelpers.segment = {
                        start: start,
                        end: end
                    }

                    sizeRule.draggingHelpers.startValue = parseFloat(document.getElementById("input_field1").value);
                    sizeRule.draggingHelpers.cam = camera;
                    sizeRule.draggingHelpers.intersection = intersection;
                    sizeRule.draggingHelpers.arrowPos = arrowPos;

                    sizeRule.draggingHelpers.startSize = sizeRule.draggingHelpers.size;

                    sizeRule.draggingHelpers.activeHandle = true;
                };
                sizeRule.onHandleDragged = function (mouse) {
                    var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                    mousePoint.unproject(sizeRule.draggingHelpers.cam);
                    var mouseRay = new THREE.Ray(sizeRule.draggingHelpers.cam.position, mousePoint.sub(sizeRule.draggingHelpers.cam.position).normalize());

                    var targetPoint = new THREE.Vector3();
                    mouseRay.distanceSqToSegment(sizeRule.draggingHelpers.segment.start,
                        sizeRule.draggingHelpers.segment.end,
                        null,
                        targetPoint);

                    var diff = targetPoint.sub(sizeRule.draggingHelpers.intersection);
                    var length = diff.length();
                    var direction = sizeRule.draggingHelpers.intersection.clone().sub(sizeRule.draggingHelpers.arrowPos);
                    var angle = diff.normalize().angleTo(direction.normalize());
                    if (angle > (0.5 * Math.PI)) length *= -1;

                    document.getElementById("input_field1").value = (sizeRule.draggingHelpers.startValue + length).round();

                    inputChanged();
                };
                sizeRule.onHandleReleased = function () {
                    oldHandle = sizeRule.draggingHelpers.activeHandle;
                    sizeRule.draggingHelpers.activeHandle = null;
                    if (sizeRule.draggingHelpers.activeHandle != oldHandle) inputChanged();
                };
                sizeRule.additionalUpdates = function () {
                    switch (this.selections[0]) {
                        case 'Axis.X':
                            sizeRule.initialSize = sizeRule.initialSizeX;
                            break;
                        case 'Axis.Y':
                            sizeRule.initialSize = sizeRule.initialSizeY;
                            break;
                        case 'Axis.Z':
                            sizeRule.initialSize = sizeRule.initialSizeZ;
                            break;
                        default:
                            break;
                    }
                };

                return sizeRule;
            }
        }

        // #################################################################################################################################
        // ############################################### ROTATION ########################################################################
        // #################################################################################################################################

        {

            var axes = ["Axis.X", "Axis.Y", "Axis.Z"];
            var degrad = ["deg", "rad"];
            self.rotationConfig = {
                type: 'Rotation',
                mode: true,
                options: [
                    {
                        label: 'Axis',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: axes
                    },
                    {
                        label: 'Amount',
                        inputType: INPUTTYPE.DOUBLE,
                        values: 0
                    },
                    {
                        label: 'Degrad',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: degrad
                    }
                ]
            };


            generateRotationRule = function () {

                var rotation = generateCustomRule(self.rotationConfig);

                rotation.generateRuleString = function () {
                    var amount = null;
                    if (rotation.selections[2] == "deg") amount = "Deg(" + rotation.selections[1] + ")";
                    else if (rotation.selections[2] == "rad") amount = "Rad(" + rotation.selections[1] + ")";
                    var ruleString = "new Rules.Rotate(" + rotation.selections[0] + ", " + amount + ", " + rotation.mode + ")";
                    ruleString = addTags(rotation, ruleString);
                    ruleString += ";";

                    rotation.lastRuleString = ruleString;

                    return ruleString;
                };
                rotation.generateShortString = function () {
                    return ("Rotation by " + rotation.selections[1] + " " + rotation.selections[2] + " on " + rotation.selections[0] + ", " + rotation.mode);
                };
                rotation.applyRule = function (shape) {
                    var amount = rotation.selections[1];
                    if (rotation.selections[2] == 'deg') {
                        amount = Math.PI * amount / 180;
                    }

                    switch (rotation.selections[0]) {
                        case 'Axis.X':
                            matrix = new THREE.Matrix4().makeRotationX(amount);
                            break;
                        case 'Axis.Y':
                            matrix = new THREE.Matrix4().makeRotationY(amount);
                            break;
                        case 'Axis.Z':
                            matrix = new THREE.Matrix4().makeRotationZ(amount);
                            break;
                        default:
                            break;
                    }

                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat);//mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                    if (this.mode == "Mode.Local" || this.mode == "Mode.LocalMid") m.premultiply(matrix);
                    if (this.mode == "Mode.Global" || this.mode == "Mode.GlobalMid") m.multiply(matrix);
                    shape.appearance.transformation = m.toArray();
                };
                rotation.unapplyRule = function (shape) {
                    var amount = -rotation.selections[1];
                    if (rotation.selections[2] == 'deg') {
                        amount = Math.PI * amount / 180;
                    }

                    switch (rotation.selections[0]) {
                        case 'Axis.X':
                            matrix = new THREE.Matrix4().makeRotationX(amount);
                            break;
                        case 'Axis.Y':
                            matrix = new THREE.Matrix4().makeRotationY(amount);
                            break;
                        case 'Axis.Z':
                            matrix = new THREE.Matrix4().makeRotationZ(amount);
                            break;
                        default:
                            break;
                    }

                    mat = shape.appearance.transformation;
                    var m = new THREE.Matrix4().fromArray(mat);//mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                    if (this.mode == "Mode.Local" || this.mode == "Mode.LocalMid") m.premultiply(matrix);
                    if (this.mode == "Mode.Global" || this.mode == "Mode.GlobalMid") m.multiply(matrix);
                    shape.appearance.transformation = m.toArray();
                };
                rotation.createHandles = function (scene, shape) {
                    this.draggingHelpers.scene = scene;

                    // switch circle color
                    var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                    var toSwitch = null;
                    if (rotation.draggingHelpers.activeHandle) toSwitch = rotation.draggingHelpers.activeHandle;
                    else if (rotation.draggingHelpers.overHandle) toSwitch = rotation.draggingHelpers.overHandle;
                    switch (toSwitch) {
                        case null:
                            break;
                        case 'x':
                            colors[0] = 0xFF0000;
                            break;
                        case 'y':
                            colors[1] = 0x00FF00;
                            break;
                        case 'z':
                            colors[2] = 0x0066FF;
                            break;
                        default:
                            break;
                    }

                    // Turn circle depending on axis
                    var material = null;
                    switch (rotation.selections[0]) {
                        case 'Axis.X':
                            material = new THREE.LineBasicMaterial({ color: colors[0] });
                            var rotationMat = new THREE.Matrix4().makeRotationY(Math.PI / 2);
                            break;
                        case 'Axis.Y':
                            material = new THREE.LineBasicMaterial({ color: colors[1] });
                            var rotationMat = new THREE.Matrix4().makeRotationX(Math.PI / 2);
                            break;
                        case 'Axis.Z':
                            material = new THREE.LineBasicMaterial({ color: colors[2] });
                            var rotationMat = new THREE.Matrix4().makeRotationZ(0);
                            break;
                        default:
                            break;
                    }

                    // Generate circle geometry
                    var radius = 0.8,
                    segments = 64,
                    geometry = new THREE.CircleGeometry(radius, segments);

                    // Remove center vertex
                    geometry.vertices.shift();

                    // Move circle to correct position
                    mat = shape.shape.appearance.transformation;
                    var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                    geometry.applyMatrix(rotationMat);
                    geometry.applyMatrix(m);

                    // Generate circle
                    var circle = new THREE.Line(geometry, material);
                    scene.add(circle);
                    rotation.draggingHelpers.id = circle.id;
                };
                rotation.onMouseOverHandle = function (id) {
                    if (rotation.draggingHelpers.overHandle) var oldHandle = rotation.draggingHelpers.overHandle;
                    switch (rotation.selections[0]) {
                        case 'Axis.X':
                            this.draggingHelpers.overHandle = 'x';
                            break;
                        case 'Axis.Y':
                            this.draggingHelpers.overHandle = 'y';
                            break;
                        case 'Axis.Z':
                            this.draggingHelpers.overHandle = 'z';
                            break;
                        default:
                            break;
                    }
                    if (oldHandle != rotation.draggingHelpers.overHandle) inputChanged();
                };
                rotation.onMouseNotOverHandle = function () {
                    oldHandle = rotation.draggingHelpers.overHandle;
                    rotation.draggingHelpers.overHandle = null;
                    if (rotation.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                rotation.onHandlePressed = function (id, mouse, intersection, scene, camera) {
                    rotation.draggingHelpers.cam = camera;
                    rotation.draggingHelpers.activeHandle = id;
                    rotation.draggingHelpers.intersection = intersection;
                    rotation.draggingHelpers.scene = scene;
                    rotation.draggingHelpers.startValue = rotation.selections[1];

                    var segment = rotation.draggingHelpers.scene.getObjectById(id);
                    rotation.draggingHelpers.vertices = segment.geometry.vertices
                };
                rotation.onHandleDragged = function (mouse) {
                    var vertices = rotation.draggingHelpers.vertices;

                    // project mouse into scene
                    var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                    mousePoint.unproject(rotation.draggingHelpers.cam);
                    var mouseRay = new THREE.Ray(rotation.draggingHelpers.cam.position, mousePoint.sub(rotation.draggingHelpers.cam.position).normalize());

                    // calc target point
                    var distance = null;
                    var minDist = Number.MAX_VALUE;
                    var nearestPoint = new THREE.Vector3();
                    var currentPoint = new THREE.Vector3();
                    var startIndex = null;
                    for (var i = 0; i < 64; i++) {
                        distance = mouseRay.distanceSqToSegment(vertices[i], vertices[i + 1], null, currentPoint);
                        if (distance < minDist) {
                            minDist = distance;
                            nearestPoint = currentPoint.clone();
                            startIndex = i;
                        }
                    }

                    // calc mid of circle
                    var oppositeIndex = startIndex + 32;
                    if (oppositeIndex > 64) {
                        oppositeIndex -= 64;
                    }
                    var offset = nearestPoint.clone().sub(vertices[startIndex]);
                    var oppositePoint = vertices[oppositeIndex].clone().sub(offset);
                    var mid = oppositePoint.clone().sub(nearestPoint).multiplyScalar(0.5).add(nearestPoint);

                    // calc rotation direction
                    var startDir = rotation.draggingHelpers.intersection.clone().sub(mid).normalize();
                    var endDir = nearestPoint.clone().sub(mid).normalize();
                    var normal = startDir.clone().cross(endDir);
                    var viewingAngle = normal.angleTo(rotation.draggingHelpers.cam.position.clone().sub(mid));
                    var standard1 = vertices[0];
                    var standard2 = vertices[1];
                    var standard1Dir = standard1.clone().sub(mid).normalize();
                    var standard2Dir = standard2.clone().sub(mid).normalize();
                    var standardNormal = standard1Dir.clone().cross(standard2Dir);
                    var standardAngle = standardNormal.angleTo(rotation.draggingHelpers.cam.position.clone().sub(mid));
                    var direction = 1;
                    if (viewingAngle < (0.5 * Math.PI)) direction *= -1;
                    if (standardAngle > (0.5 * Math.PI)) direction *= -1;
                    if (rotation.selections[0] == "Axis.Y") direction *= -1;

                    // calc rotation angle            
                    var angle = startDir.angleTo(endDir);

                    // update input fields
                    if (rotation.selections[2] == "rad") {
                        document.getElementById("input_field1").value = '' + (rotation.draggingHelpers.startValue + direction * angle).round();
                    } else {
                        document.getElementById("input_field1").value = '' + (rotation.draggingHelpers.startValue + direction * ((angle * 180) / Math.PI)).round();
                    }

                    inputChanged();
                };
                rotation.onHandleReleased = function () {
                    oldHandle = rotation.draggingHelpers.activeHandle;
                    rotation.draggingHelpers.activeHandle = null;
                    if (rotation.draggingHelpers.activeHandle != oldHandle) inputChanged();
                };

                return rotation;
            }
        }


        // #################################################################################################################################
        // ################################################## SPLIT ########################################################################
        // #################################################################################################################################

        {
            generateSplitRule = function () {

                var split = jQuery.extend(true, {}, abstractRule)
                // helpers
                {
                    split.draggingHelpers = {
                        nextIndex: 0,
                        epsilon: 0.001
                    };

                    split.generatesMultipleShapes = true;

                    split.addPart = function (settings) {
                        var button = document.getElementById("addPartButton");
                        var partDiv = document.createElement('div');
                        partDiv.style = 'margin:0.01em 16px';
                        partDiv.id = 'partDiv' + split.draggingHelpers.nextIndex;
                        var partname = 'part' + split.draggingHelpers.nextIndex + '_mode_selector';
                        var innerHTML = '<select id=' + partname + '>';
                        innerHTML += '<option value="Relative">Relative</option>';
                        innerHTML += '<option value="Absolute">Absolute</option>';
                        innerHTML += '</select>';
                        partDiv.innerHTML += innerHTML;
                        var amount_input = document.createElement("input");
                        amount_input.setAttribute('type', 'text');
                        var inputname = 'part' + split.draggingHelpers.nextIndex + '_amount_input_field';
                        amount_input.setAttribute('id', inputname);
                        partDiv.appendChild(amount_input);

                        var addPostfixName = 'part' + split.draggingHelpers.nextIndex + '_add_postfix_button';
                        var addPostfixButton = document.createElement('button');
                        addPostfixButton.id = addPostfixName;
                        addPostfixButton.style = 'margin:0px 20px';
                        var addPostfixButtonText = document.createTextNode('add Postfix');
                        addPostfixButton.appendChild(addPostfixButtonText);
                        partDiv.appendChild(addPostfixButton);

                        var removename = 'part' + split.draggingHelpers.nextIndex + '_remove_button';
                        var removeButton = document.createElement('button');
                        removeButton.id = removename;
                        removeButton.style = 'position:absolute;right:5px';
                        var removeButtonText = document.createTextNode('X');
                        removeButton.appendChild(removeButtonText);
                        partDiv.appendChild(removeButton);

                        button.parentNode.insertBefore(partDiv, button);
                        $('#' + partname).change(inputChanged);
                        $('#' + inputname).change(inputChanged);
                        $('#' + addPostfixName).click(split.addPostfixFunction(partDiv.id, settings))
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
                                split.addPostfix(partDiv.id, settings.postfixes[i]);
                            }
                        } else {
                            amount_input.value = 1;
                        }

                        this.draggingHelpers.nextIndex++;
                        inputChanged();
                    };

                    split.addPostfixFunction = function (partId, settings) {
                        return function () {
                            split.addPostfix(partId, settings);
                        }
                    };
                    split.addPostfix = function (partId, settings) {
                        part = document.getElementById(partId);
                        var possiblePostfixes = ["Goal", "goal", "Tag", "Attribute", "Asset", "Paint", "Orientation", "Reflect", "Void", "Family", "Sync"];
                        renderer.postfixController.addPostfix(part, settings, possiblePostfixes, deleteButton = true);
                    }
                }
                // standard functions
                split.type = 'Split';
                split.generateRuleString = function () {
                    var ruleString = "new Rules.Split(" + split.axis + ",";
                    var counter = 1;
                    for (var part in split.parts) {
                        ruleString += "\n\t\t" + split.parts[part].mode + "(" + split.parts[part].amount + ")";
                        if (counter < Object.keys(split.parts).length) ruleString += ',';
                        ruleString = addTags(split.parts[part], ruleString, 3);
                        counter++;
                    }
                    ruleString += "\n\t\t)";
                    ruleString = addTags(split, ruleString);
                    ruleString += ";";

                    split.lastRuleString = ruleString;

                    return ruleString;
                };
                split.generateShortString = function () {
                    var keys = Object.keys(split.parts);
                    var size = keys.length;
                    return ("Split into " + size + " parts.");
                };
                split.appendInputFields = function (parentDiv, empty) {
                    var innerHTML = '<select id="axis_selector">';
                    innerHTML += '<option value="Axis.X">Axis.X</option>';
                    innerHTML += '<option value="Axis.Y">Axis.Y</option>';
                    innerHTML += '<option value="Axis.Z">Axis.Z</option>';
                    innerHTML += '</select>'
                    parentDiv.innerHTML += innerHTML;

                    var addPartButton = document.createElement('button');
                    addPartButton.id = "addPartButton";
                    addPartButton.style.marginLeft = "1em";
                    var addPartButton_text = document.createTextNode("add Part");
                    addPartButton.appendChild(addPartButton_text);
                    parentDiv.appendChild(addPartButton);

                    $("#addPartButton").click(function () {
                        split.addPart(null);
                    });
                    $('#axis_selector').change(inputChanged);

                    if (!empty) {
                        var selector = document.getElementById("axis_selector");
                        for (var i = 0; i < 3; i++) {
                            if (selector.options[i].label == split.axis) selector.selectedIndex = i;
                        }
                        for (var i = 0; i < Object.keys(split.parts).length; i++) {
                            split.addPart(split.parts[Object.keys(split.parts)[i]]);
                        }
                    } else {
                        split.addPart();
                        split.addPart();
                    }
                };
                split.applyRule = function (shape) {
                    var parts = split.parts;
                    var sumAbs = 0;
                    var sumRel = 0;
                    for (var i = 0; i < Object.keys(parts).length; i++) {
                        var partname = Object.keys(parts)[i];
                        if (parts[partname].mode == "Relative") {
                            var add = isNaN(parseFloat(parts[partname].amount)) ? 0 : parseFloat(parts[partname].amount);
                            add = Math.max(0.000001, add);
                            sumRel += add;
                        } else {
                            var add = isNaN(parseFloat(parts[partname].amount)) ? 0 : parseFloat(parts[partname].amount);
                            add = Math.max(0.000001, add);
                            sumAbs += add;
                        }
                    }

                    var m = shape.appearance.transformation;
                    var xDir = new THREE.Vector3(m[0], m[1], m[2]);
                    var yDir = new THREE.Vector3(m[4], m[5], m[6]);
                    var zDir = new THREE.Vector3(m[8], m[9], m[10]);
                    var size, width, height;
                    switch (split.axis) {
                        case 'Axis.X':
                            size = xDir.length();
                            width = yDir.length();
                            height = zDir.length();
                            break;
                        case 'Axis.Y':
                            size = yDir.length();
                            width = xDir.length();
                            height = zDir.length();
                            break;
                        case 'Axis.Z':
                            size = zDir.length();
                            width = xDir.length();
                            height = yDir.length();
                            break;
                        default:
                            break;
                    }

                    split.draggingHelpers.fullSize = size;
                    split.draggingHelpers.width = width;
                    split.draggingHelpers.height = height;

                    var avRel = size - sumAbs;
                    var segRelSize = 0;
                    split.draggingHelpers.partKind = [];
                    split.draggingHelpers.segments = [];
                    split.draggingHelpers.input = [];
                    for (var i = 0; i < Object.keys(parts).length; i++) {
                        var partname = Object.keys(parts)[i];
                        if (parts[partname].mode == "Relative") {
                            var amount = isNaN(parseFloat(parts[partname].amount)) ? 0 : parseFloat(parts[partname].amount);
                            amount = Math.max(split.draggingHelpers.epsilon, amount);
                            split.draggingHelpers.partKind.push('rel');
                            var segmentSize = amount / sumRel * avRel
                            split.draggingHelpers.segments.push(segmentSize);
                            split.draggingHelpers.input.push(amount);
                            segRelSize = segRelSize + segmentSize;
                        } else {
                            var amount = isNaN(parseFloat(parts[partname].amount)) ? 0 : parseFloat(parts[partname].amount);
                            amount = Math.max(split.draggingHelpers.epsilon, amount);
                            split.draggingHelpers.partKind.push('abs');
                            split.draggingHelpers.segments.push(amount);
                            split.draggingHelpers.input.push(amount);
                        }
                    }
                    split.draggingHelpers.unitsPerInput = 1;
                    if (sumRel != 0) split.draggingHelpers.unitsPerInput = segRelSize / sumRel;
                    split.draggingHelpers.sumRel = segRelSize;
                };
                split.unapplyRule = function (shape) {
                    split.draggingHelpers.segments = [1];
                };
                split.updateRule = function () {
                    split.parts = [];

                    var selector = document.getElementById("axis_selector");
                    var selection = selector.options[selector.selectedIndex].value;
                    split.axis = selection;

                    var sumAbs = 0;
                    for (var i = 0; i < split.draggingHelpers.nextIndex; i++) {
                        var name = 'part' + i + '_mode_selector';
                        var modeSelector = document.getElementById(name);
                        if (modeSelector) {
                            var amountInput = document.getElementById('part' + i + '_amount_input_field');
                            var mode = modeSelector.options[modeSelector.selectedIndex].value;
                            var amount = amountInput.value;
                            if (mode == 'Absolute') sumAbs += parseFloat(amount);
                            split.parts['part' + i] = { mode: mode, amount: amount };

                            var partId = 'partDiv' + i;
                            var part = document.getElementById(partId)
                            readTags(part, split.parts['part' + i]);
                        }
                    }

                    if (!split.draggingHelpers.fullSize) split.draggingHelpers.fullSize = 99999999;
                    if (split.draggingHelpers.fullSize < sumAbs - split.draggingHelpers.epsilon) {
                        split.draggingHelpers.dontDraw = true;
                        alert("Sum of absolute parts is larger than available size.\nThis would result in an error!");
                    } else split.draggingHelpers.dontDraw = false;
                };
                split.addPreview = function (shape) {
                    if (split.draggingHelpers.dontDraw) return;

                    var offset = -split.draggingHelpers.fullSize / 2;
                    var scale;
                    var translate;
                    var mat;
                    for (var i = 0; i < split.draggingHelpers.segments.length; i++) {
                        var m = shape.appearance.transformation;
                        m = new THREE.Matrix4().fromArray(m);
                        var size = Math.max(0.000001, split.draggingHelpers.segments[i]);
                        switch (split.axis) {
                            case 'Axis.X':
                                scale = new THREE.Matrix4().makeScale(size / split.draggingHelpers.fullSize, 1, 1);
                                translate = new THREE.Matrix4().makeTranslation(offset + size / 2, 0, 0);
                                break;
                            case 'Axis.Y':
                                scale = new THREE.Matrix4().makeScale(1, size / split.draggingHelpers.fullSize, 1);
                                translate = new THREE.Matrix4().makeTranslation(0, offset + size / 2, 0);
                                break;
                            case 'Axis.Z':
                                scale = new THREE.Matrix4().makeScale(1, 1, size / split.draggingHelpers.fullSize);
                                translate = new THREE.Matrix4().makeTranslation(0, 0, offset + size / 2);
                                break;
                            default:
                                break;
                        }
                        offset += size;
                        m.premultiply(scale);
                        m.multiply(translate.transpose());
                        segmentShape = jQuery.extend(true, {}, shape);
                        segmentShape.appearance.transformation = m.toArray();
                        addPreview(segmentShape);
                    }
                };
                split.removePreview = function (shape) {
                    while (self.previewScene.children.length != 0) {
                        self.previewScene.remove(self.previewScene.children[0]);
                    }
                    meshes.delete(shape.id);
                    renderer.RenderSingleFrame();
                };
                split.createHandles = function (scene, shape) {
                    if (split.draggingHelpers.dontDraw) return;

                    this.draggingHelpers.scene = scene;

                    var basicColors = [0xAA3030, 0x30AA30, 0x3030AA];
                    var highlightColors = [0xFF0000, 0x00FF00, 0x0000FF];

                    mat = shape.shape.appearance.transformation;
                    var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                    center = new THREE.Vector3(0, 0, 0);
                    center.applyProjection(m);

                    var dir;
                    switch (split.axis) {
                        case 'Axis.X':
                            dir = new THREE.Vector3(1.0, 0, 0);
                            break;
                        case 'Axis.Y':
                            dir = new THREE.Vector3(0, 1.0, 0);
                            break;
                        case 'Axis.Z':
                            dir = new THREE.Vector3(0, 0, 1.0);
                            break;
                        default:
                            break;
                    }

                    dir.applyProjection(m);
                    dir.sub(center);

                    var widthOffset = split.draggingHelpers.width / (split.draggingHelpers.segments.length - 1);
                    var heightOffset = split.draggingHelpers.height / (split.draggingHelpers.segments.length - 1);

                    switch (split.axis) {
                        case 'Axis.X':
                            center.add(new THREE.Vector3(-split.draggingHelpers.fullSize / 2, -split.draggingHelpers.width / 2 - widthOffset / 2, -split.draggingHelpers.height / 2 - heightOffset / 2));
                            break;
                        case 'Axis.Y':
                            center.add(new THREE.Vector3(-split.draggingHelpers.width / 2 - widthOffset / 2, -split.draggingHelpers.fullSize / 2, -split.draggingHelpers.height / 2 - heightOffset / 2));
                            break;
                        case 'Axis.Z':
                            center.add(new THREE.Vector3(-split.draggingHelpers.width / 2 - widthOffset / 2, -split.draggingHelpers.height / 2 - heightOffset / 2, -split.draggingHelpers.fullSize / 2));
                            break;
                        default:
                            break;
                    }

                    split.draggingHelpers.highlight = null;
                    var search = 0;
                    if (!split.draggingHelpers.arrowIds) split.draggingHelpers.arrowIds = [];
                    if (split.draggingHelpers.overHandle) search = split.draggingHelpers.overHandle;
                    else if (split.draggingHelpers.activeHandle) search = split.draggingHelpers.activeHandle;
                    for (var i = 0; i < split.draggingHelpers.arrowIds.length; i++) {
                        if (split.draggingHelpers.arrowIds[i] <= search && split.draggingHelpers.arrowIds[i] + 2 >= search) {
                            split.draggingHelpers.highlight = Math.floor(i / 2);
                        }
                    };

                    var oldStartingId = split.draggingHelpers.arrowIds[0] || 0;
                    split.draggingHelpers.arrowIds = [];
                    var counter = 0;
                    for (var i = 0; i < split.draggingHelpers.segments.length - 1; i++) {
                        var size = Math.max(0.000001, split.draggingHelpers.segments[i]);
                        switch (split.axis) {
                            case 'Axis.X':
                                center.add(new THREE.Vector3(size, widthOffset, heightOffset));
                                if (counter == split.draggingHelpers.highlight) color = highlightColors[0];
                                else color = basicColors[0];
                                break;
                            case 'Axis.Y':
                                center.add(new THREE.Vector3(widthOffset, size, heightOffset));
                                if (counter == split.draggingHelpers.highlight) color = highlightColors[1];
                                else color = basicColors[1];
                                break;
                            case 'Axis.Z':
                                center.add(new THREE.Vector3(widthOffset, heightOffset, size));
                                if (counter == split.draggingHelpers.highlight) color = highlightColors[2];
                                else color = basicColors[2];
                                break;
                            default:
                                break;
                        }
                        counter++;

                        var arrowlength = Math.max(split.draggingHelpers.fullSize / 5, 0.1);
                        var backarrow = new THREE.ArrowHelper(new THREE.Vector3().sub(dir).normalize(), center, arrowlength, color, 0.2, 0.1);
                        var arrow = new THREE.ArrowHelper(dir.normalize(), center, arrowlength, color, 0.2, 0.1);
                        scene.add(arrow);
                        scene.add(backarrow);

                        split.draggingHelpers.arrowIds.push(arrow.id);
                        split.draggingHelpers.arrowIds.push(backarrow.id);
                    }
                    split.draggingHelpers.idOffset = split.draggingHelpers.arrowIds[0] - oldStartingId;
                };
                split.onMouseOverHandle = function (id) {
                    oldHandle = split.draggingHelpers.overHandle;
                    split.draggingHelpers.overHandle = id;
                    if (split.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                split.onMouseNotOverHandle = function () {
                    oldHandle = split.draggingHelpers.overHandle;
                    split.draggingHelpers.overHandle = null;
                    if (split.draggingHelpers.overHandle != oldHandle) inputChanged();
                };
                split.onHandlePressed = function (id, mouse, intersection, scene, camera) {

                    id += split.draggingHelpers.idOffset;

                    var clickedObject = scene.getObjectById(id);
                    var arrowPos = clickedObject.parent.position;
                    var initStart = arrowPos.clone();
                    var initEnd = intersection.clone();
                    var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                    var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                    split.draggingHelpers.segment = {
                        start: start,
                        end: end
                    };

                    split.draggingHelpers.directionFactor = 1;
                    for (var i = 0; i < split.draggingHelpers.arrowIds.length; i++) {
                        if (split.draggingHelpers.arrowIds[i] <= id && split.draggingHelpers.arrowIds[i] + 2 >= id) {
                            split.draggingHelpers.beforeActiveCut = Math.floor(i / 2);
                            if (i.isOdd()) split.draggingHelpers.directionFactor = -1;
                        }
                    }

                    split.draggingHelpers.startingSegments = split.draggingHelpers.segments.slice();
                    split.draggingHelpers.startingInput = split.draggingHelpers.input.slice();

                    split.draggingHelpers.cam = camera;
                    split.draggingHelpers.intersection = intersection;
                    split.draggingHelpers.arrowPos = arrowPos;

                    split.draggingHelpers.activeHandle = id;
                };
                split.onHandleDragged = function (mouse) {
                    var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                    mousePoint.unproject(split.draggingHelpers.cam);
                    var mouseRay = new THREE.Ray(split.draggingHelpers.cam.position, mousePoint.sub(split.draggingHelpers.cam.position).normalize());

                    var targetPoint = new THREE.Vector3();
                    mouseRay.distanceSqToSegment(split.draggingHelpers.segment.start,
                        split.draggingHelpers.segment.end,
                        null,
                        targetPoint);

                    var diff = targetPoint.sub(split.draggingHelpers.intersection);
                    var length = diff.length();
                    var direction = split.draggingHelpers.intersection.clone().sub(split.draggingHelpers.arrowPos);
                    var angle = diff.normalize().angleTo(direction.normalize());
                    if (angle > (0.5 * Math.PI)) length *= -1;
                    length *= split.draggingHelpers.directionFactor;

                    if (length > 0) {
                        toReduce = split.draggingHelpers.beforeActiveCut + 1;
                        toEnlarge = split.draggingHelpers.beforeActiveCut;
                    } else {
                        toReduce = split.draggingHelpers.beforeActiveCut;
                        toEnlarge = split.draggingHelpers.beforeActiveCut + 1;
                    }

                    var inputs = split.draggingHelpers.startingInput.slice();
                    var segments = split.draggingHelpers.startingSegments.slice();
                    var types = split.draggingHelpers.partKind.slice();

                    var maxMovement = segments[toReduce];
                    length = Math.min(maxMovement, Math.abs(length));

                    var nrRel = 0;
                    for (var i = 0; i < segments.length; i++) {
                        if (types[i] == 'rel') nrRel++;
                    }
                    if (nrRel == 1) {
                        if (types[toReduce] == 'rel') {
                            segments[toEnlarge] += length;
                            segments[toReduce] = inputs[toReduce] * split.draggingHelpers.unitsPerInput;
                        } else if (types[toEnlarge] == 'rel') {
                            segments[toReduce] -= length;
                            segments[toEnlarge] = inputs[toEnlarge] * split.draggingHelpers.unitsPerInput;
                        } else {
                            segments[toReduce] -= length;
                            segments[toEnlarge] += length;
                        }
                    } else {
                        segments[toReduce] -= length;
                        segments[toEnlarge] += length;
                    }

                    var counter = 0;
                    for (var i = 0; i < split.draggingHelpers.nextIndex; i++) {
                        amountInput = document.getElementById('part' + i + '_amount_input_field');
                        if (amountInput) {
                            if (counter == toReduce || counter == toEnlarge) {
                                if (types[counter] == 'abs') {
                                    amountInput.value = Math.max(split.draggingHelpers.epsilon, segments[counter]).round();
                                } else {
                                    if (isNaN(segments[counter] / split.draggingHelpers.unitsPerInput)) {
                                        var amount = inputs[counter];
                                    } else if (isFinite(segments[counter] / split.draggingHelpers.unitsPerInput)) {
                                        var amount = segments[counter] / split.draggingHelpers.unitsPerInput;
                                    } else {
                                        var amount = inputs[counter];
                                    }
                                    amountInput.value = Math.max(split.draggingHelpers.epsilon, amount).round();
                                }
                            }
                            counter++;
                        }
                    }

                    inputChanged();
                };
                split.onHandleReleased = function () {
                    oldHandle = split.draggingHelpers.activeHandle;
                    split.draggingHelpers.activeHandle = null;
                    if (split.draggingHelpers.activeHandle != oldHandle) inputChanged();
                };

                return split;
            }
        }


        // #################################################################################################################################
        // ################################################## Orientation ##################################################################
        // #################################################################################################################################

        {
            var turns = ["Turn.X90", "Turn.X180", "Turn.X270", "Turn.Y90", "Turn.Y180", "Turn.Y270", "Turn.Z90", "Turn.Z180", "Turn.Z270"];
            self.orientationConfig = {
                type: 'Orientation',
                mode: false,
                options: [
                    {
                        label: 'Turn',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: turns
                    }
                ]
            }

            generateOrientationRule = function () {
                return generateCustomRule(self.orientationConfig);
            }
        }

        // #################################################################################################################################
        // ################################################## Reflection ###################################################################
        // #################################################################################################################################

        {
            var axes = ["Axis.X", "Axis.Y", "Axis.Z"];
            self.reflectionConfig = {
                type: 'Reflect',
                mode: true,
                options: [
                    {
                        label: 'Axis',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: axes
                    }
                ]
            }

            generateReflectionRule = function () {
                return generateCustomRule(self.reflectionConfig);
            }
        }

        // #################################################################################################################################
        // ################################################## PAINT ########################################################################
        // #################################################################################################################################

        {

            var materials = ["Material.Brass", "Material.Bronze", "Material.PolishedBronze", "Material.Chrome",
        "Material.Copper", "Material.PolishedCopper", "Material.Gold", "Material.PolishedGold",
        "Material.Pewter", "Material.Silver", "Material.PolishedSilver", "Material.Glass",
        "Material.Emerald", "Material.Jade", "Material.Obsidian", "Material.Pearl",
        "Material.Ruby", "Material.Turquoise", "Material.BlackPlastic", "Material.BlackRubber",
        "Material.White",
        "Material.Red", "Material.Pink", "Material.Purple", "Material.DeepPurple",
        "Material.Indigo", "Material.Blue", "Material.LightBlue", "Material.Cyan",
        "Material.Teal", "Material.Green", "Material.LightGreen", "Material.Lime",
        "Material.Yellow", "Material.Amber", "Material.Orange", "Material.DeepOrange",
        "Material.Brown", "Material.Grey", "Material.BlueGrey"];
            self.paintConfig = {
                type: 'Paint',
                mode: false,
                options: [
                    {
                        label: 'Material',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: materials
                    },
                    {
                        label: 'Tone',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                    }
                ]
            }

            generatePaintRule = function () {

                var paint = generateCustomRule(self.paintConfig);

                paint.generateRuleString = function () {
                    var ruleString = "new Rules.Paint(" + paint.selections[0];
                    if (paint.selections[1] != null) ruleString += '(' + rupaintle.selections[1] + ')';
                    ruleString += ')';
                    ruleString = addTags(paint, ruleString);
                    ruleString += ";";
                    return ruleString;
                };
                paint.generateShortString = function () {
                    var ruleString = "Paint with " + paint.selections[0];
                    if (paint.selections[1] != null) ruleString += '(' + paint.selections[1] + ')';
                    return ruleString;
                };
                paint.onselectionChange = function () {
                    var selector = document.getElementById('dropdown0');
                    var toneSelector = document.getElementById('dropdown1');
                    var toneLabel = document.getElementById('label1');
                    if (selector.selectedIndex > 19) {
                        toneSelector.style.display = 'inline';
                        toneLabel.style.display = 'inline';
                    } else {
                        toneSelector.style.display = 'none';
                        toneLabel.style.display = 'none';
                    }
                    inputChanged();
                };
                paint.createRuleDescriptor = function () {
                    var rule = {
                        type: 'Paint',
                        selections: []
                    }
                    var selector = document.getElementById('dropdown0');
                    var toneSelector = document.getElementById('dropdown1');
                    rule.selections.push(selector.options[selector.selectedIndex].label);
                    if (toneSelector.style.display != 'none') {
                        rule.selections.push(toneSelector.options[toneSelector.selectedIndex].label);
                    } else {
                        rule.selections.push(null);
                    }
                    return rule;
                };

                return paint;
            }
        }

        // #################################################################################################################################
        // ################################################## HUE ##########################################################################
        // #################################################################################################################################

        {

            var colors = ["Color.Ambient", "Color.Diffuse", "Color.Emmisive", "Color.AmbientAndDiffuse", "Color.Specular"];
            self.hueConfig = {
                type: 'Hue',
                mode: true,
                options: [
                    {
                        label: 'Color Type',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: colors
                    },
                    {
                        label: 'Value',
                        inputType: INPUTTYPE.DOUBLE,
                        values: null
                    }
                ]
            }

            generateHueRule = function () {
                return generateCustomRule(self.hueConfig);
            }
        }

        // #################################################################################################################################
        // ################################################## SATURATION ###################################################################
        // #################################################################################################################################

        {
            self.saturationConfig = {
                type: 'Saturate',
                mode: true,
                options: [
                    {
                        label: 'Color Type',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: colors
                    },
                    {
                        label: 'Value',
                        inputType: INPUTTYPE.DOUBLE,
                        values: null
                    }
                ]
            }

            generateSaturationRule = function () {
                return generateCustomRule(self.saturationConfig);
            }
        }

        // #################################################################################################################################
        // ################################################## ASSET ########################################################################
        // #################################################################################################################################

        {
            var primitives = ["Primitive.Arch", "Primitive.Box", "Primitive.Circle", "Primitive.Cone",
        "Primitive.Cylinder", "Primitive.Dodecahedron", "Primitive.Icosahedron", "Primitive.Octahedron",
        "Primitive.Plane", "Primitive.Prism", "Primitive.Gable", "Primitive.Ring",
        "Primitive.Sphere", "Primitive.Tetrahedron", "Primitive.Torus", "Primitive.TorusKnot"];

            self.assetConfig = {
                type: 'Asset',
                mode: false,
                options: [
                    {
                        label: 'Primitive',
                        inputType: INPUTTYPE.DROPDOWN,
                        values: primitives
                    }
                ]
            }

            generateAssetRule = function () {
                return generateCustomRule(self.assetConfig);
            }
        }

        // #################################################################################################################################
        // ################################################## Goal #########################################################################
        // #################################################################################################################################

        {
            self.GoalConfig = {
                type: 'Goal',
                mode: false,
                options: [
                    {
                        label: 'Goal',
                        inputType: INPUTTYPE.TAGS,
                        values: null
                    }
                ]
            }

            generateGoalRule = function () {
                return generateCustomRule(self.GoalConfig);
            }
        }

        // #################################################################################################################################
        // ################################################## goal #########################################################################
        // #################################################################################################################################

        {
            self.goalConfig = {
                type: 'goal',
                mode: false,
                options: [
                    {
                        label: 'goal',
                        inputType: INPUTTYPE.TAGS,
                        values: null
                    }
                ]
            }

            generategoalRule = function () {
                return generateCustomRule(self.goalConfig);
            }
        }

        // #################################################################################################################################
        // ################################################## Attribute ####################################################################
        // #################################################################################################################################

        {
            self.attributeConfig = {
                type: 'Attribute',
                mode: false,
                options: [
                    {
                        label: 'Name',
                        inputType: INPUTTYPE.STRING,
                        values: null
                    },
                    {
                        label: 'Value',
                        inputType: INPUTTYPE.RAW,
                        values: null
                    }
                ]
            }

            generateAttributeConfig = function () {
                return generateCustomRule(self.attributeConfig);
            }
        }

        // #################################################################################################################################
        // ##################################################### Concat ####################################################################
        // #################################################################################################################################

        {
            generateConcatRule = function () {

                var concat = jQuery.extend(true, {}, abstractRule)

                concat.type = 'Concat';

                concat.generateRuleString = function (rule) {
                    var output = "new Rules.Concat(";
                    for (var i = 0; i < rule.selections.length; i++) {
                        output += "\n";
                        output += self.rules.get(rule.selections[i].type).generateRuleString(rule.selections[i]);
                        output = output.slice(0, -1);
                        output += ",";
                    }
                    output = output.slice(0, -1);
                    output += "\n);";
                    return output;
                };

                concat.generateShortString = function (rule) {
                    var output = "Concat of ";
                    output += rule.selections.length;
                    output += " rules";
                    return output;
                };

                concat.applyRule = function (rule, shape) {
                    for (var i = 0; i < rule.selections.length; i++) {
                        self.rules.get(rule.selections[i].type).applyRule(rule.selections[i], shape);
                        if (rule.selections[i].wasParsed) {
                            parsedRules[rule.selections[i].index].inConcat = true;
                        } else {
                            tmpRules[rule.selections[i].index].inConcat = true;
                        }
                    }
                };

                concat.unapplyRule = function (rule, shape) {
                    for (var i = rule.selections.length - 1; i >= 0; i--) {
                        self.rules.get(rule.selections[i].type).unapplyRule(rule.selections[i], shape);
                    }
                };

                concat.dummy = { Type: "Concat" };
                concat.appendInputFields = function (parentDiv, rule, dontUpdateFromRule) {
                    if (!rule || !concat.draggingHelpers.selections) {
                        concat.draggingHelpers.selections = [];
                        rule = concat.dummy;
                    } else if (rule && rule.selections && !dontUpdateFromRule) {
                        concat.draggingHelpers.selections = rule.selections.slice();
                    }

                    while (parentDiv.hasChildNodes()) {
                        parentDiv.removeChild(parentDiv.lastChild);
                    }


                    // list current selection
                    var selectionListDiv = document.createElement('div');
                    selectionListDiv.id = "concatRuleSelectionDiv";
                    selectionListDiv.classList = "w3-container";
                    selectionListDiv.style = "position:relative; border-bottom: 1px solid black;";

                    for (var i = 0; i < concat.draggingHelpers.selections.length; i++) {
                        var ruleDiv = document.createElement('div');
                        ruleDiv.style = "height:2em;position:relative;";
                        selectionListDiv.appendChild(ruleDiv);
                        ruleDiv.innerHTML = "<span class='tag-tag'>" + self.generateShortString(concat.draggingHelpers.selections[i]) + "</span>";

                        if (i != 0 &&
                            !concat.draggingHelpers.selections[i].generatesMultipleShapes) {
                            var up_button = document.createElement("button");
                            up_button.id = "up_Button_" + i;
                            up_button.classList = "w3-btn";
                            up_button.style = "height:2em;float:right;padding:3px 16px;"
                            var up_button_text = document.createTextNode("up");

                            up_button.appendChild(up_button_text);
                            ruleDiv.appendChild(up_button);
                        }

                        if (i != concat.draggingHelpers.selections.length - 1 &&
                            !concat.draggingHelpers.selections[i + 1].generatesMultipleShapes) {
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
                    for (var i = 0; i < concat.draggingHelpers.selections.length; i++) {
                        $("#up_Button_" + i).click(function (i) {
                            return function () {
                                var tmp = concat.draggingHelpers.selections[i];
                                concat.draggingHelpers.selections[i] = concat.draggingHelpers.selections[i - 1];
                                concat.draggingHelpers.selections[i - 1] = tmp;

                                inputChanged();
                                concat.appendInputFields(parentDiv, rule, true);
                            };
                        }(i))
                    }

                    // down button function
                    for (var i = 0; i < concat.draggingHelpers.selections.length; i++) {
                        $("#down_Button_" + i).click(function (i) {
                            return function () {
                                var tmp = concat.draggingHelpers.selections[i];
                                concat.draggingHelpers.selections[i] = concat.draggingHelpers.selections[i + 1];
                                concat.draggingHelpers.selections[i + 1] = tmp;

                                inputChanged();
                                concat.appendInputFields(parentDiv, rule, true);
                            };
                        }(i))
                    }

                    // remove button function
                    for (var i = 0; i < concat.draggingHelpers.selections.length; i++) {
                        $("#removeRule_Button_" + i).click(function (i) {
                            return function () {
                                parsedRules[concat.draggingHelpers.selections[i].index].inConcat = false;
                                concat.draggingHelpers.selections.splice(i, 1);

                                inputChanged();
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
                    for (var i = 0; i < parsedRules.length; i++) {
                        if (!parsedRules[i].deleted &&
                            !parsedRules[i].edited &&
                            !parsedRules[i].inConcat &&
                            parsedRules[i] != rule &&
                            !(lastAdded && lastAdded.generatesMultipleShapes)) {

                            var ruleDiv = document.createElement('div');
                            ruleDiv.style = "height:2em;position:relative;";
                            ruleListDiv.appendChild(ruleDiv);
                            ruleDiv.innerHTML = "<span class='tag-tag'>" + self.generateShortString(parsedRules[i]) + "</span>";

                            var add_button = document.createElement("button");
                            add_button.id = "addRule_Button_" + i;
                            add_button.classList = "w3-btn";
                            add_button.style = "height:2em;float:right;padding:3px 16px;"
                            var add_button_text = document.createTextNode("add");

                            lastAdded = parsedRules[i];

                            add_button.appendChild(add_button_text);
                            ruleDiv.appendChild(add_button);
                        }
                    }
                    for (var i = 0; i < tmpRules.length; i++) {
                        if (tmpRules[i] != rule &&
                            tmpRules[i] != concat.createRuleDescriptor() &&
                            !tmpRules[i].inConcat &&
                            !(lastAdded && lastAdded.generatesMultipleShapes)) {
                            var ruleDiv = document.createElement('div');
                            ruleDiv.style = "height:2em;position:relative;";
                            ruleListDiv.appendChild(ruleDiv);
                            ruleDiv.innerHTML = "<span class='tag-tag'>" + self.generateShortString(tmpRules[i]) + "</span>";

                            var add_button = document.createElement("button");
                            add_button.id = "addRule_Button_" + (i + parsedRules.length);
                            add_button.classList = "w3-btn";
                            add_button.style = "height:2em;float:right;padding:3px 16px;"
                            var add_button_text = document.createTextNode("add");

                            lastAdded = parsedRules[i];

                            add_button.appendChild(add_button_text);
                            ruleDiv.appendChild(add_button);
                        }
                    }

                    parentDiv.appendChild(ruleListDiv);

                    // add buttons functions
                    for (var i = 0; i < parsedRules.length; i++) {
                        $("#addRule_Button_" + i).click(function (i) {
                            return function () {
                                parsedRules[i].index = i;
                                concat.draggingHelpers.selections.push(parsedRules[i]);
                                parsedRules[i].inConcat = true;
                                inputChanged();

                                concat.appendInputFields(parentDiv, rule, true);
                            };
                        }(i))
                    }
                    for (var i = 0; i < tmpRules.length; i++) {
                        $("#addRule_Button_" + (i + parsedRules.length)).click(function (i) {
                            return function () {
                                tmpRules[i].index = i;
                                concat.draggingHelpers.selections.push(tmpRules[i]);
                                tmpRules[i].inConcat = true;
                                inputChanged();

                                concat.appendInputFields(parentDiv, rule, true);
                            };
                        }(i))
                    }
                };

                concat.createRuleDescriptor = function (oldRule) {
                    if (!concat.draggingHelpers.selections) concat.draggingHelpers.selections = [];
                    if (oldRule) {
                        var rule = jQuery.extend(true, {}, oldRule)
                    } else {
                        var rule = {};
                    }
                    rule.tags = {};
                    rule.mode = null;
                    rule.type = "Concat";
                    rule.selections = concat.draggingHelpers.selections.slice();
                    return rule;
                }

                return concat;
            }
        }
    }


    self.rules.set(self.translateConfig.type, generateTranslationRule);
    self.rules.set(self.scaleConfig.type, generateScaleRule);
    self.rules.set(self.growConfig.type, generateGrowRule);
    self.rules.set(self.sizeConfig.type, generateSizeRule);
    self.rules.set(self.rotationConfig.type, generateRotationRule);
    self.rules.set(self.orientationConfig.type, generateOrientationRule);
    self.rules.set(self.reflectionConfig.type, generateReflectionRule);
    self.rules.set("Split", generateSplitRule);
    self.rules.set(self.paintConfig.type, generatePaintRule);
    self.rules.set(self.hueConfig.type, generateHueRule);
    self.rules.set(self.saturationConfig.type, generateSaturationRule);
    self.rules.set(self.attributeConfig.type, generateAttributeConfig);
    self.rules.set(self.assetConfig.type, generateAssetRule);
    self.rules.set(self.GoalConfig.type, generateGoalRule);
    self.rules.set(self.goalConfig.type, generategoalRule);
    self.rules.set("Concat", generateConcatRule);

return self;
}