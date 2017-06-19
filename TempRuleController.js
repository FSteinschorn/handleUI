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
    }
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
                return self.rules.get(type).generateShortString(rule);
                break;
        }
    }

    self.addRule = function (shape, rule) {
        tmpRules.push(rule);

        self.rules.get(rule.type).applyRule(rule, shape);
        if (meshes[shape.id])
            self.rules.get(rule.type).removePreview(shape)
        self.rules.get(rule.type).addPreview(shape);
        
        var editor = ace.edit("code_text_ace");
        editor.setValue(editor.getValue() + "\n\n" + self.rules.get(rule.type).generateRuleString(rule), 1);
    }

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
                editor.setValue(editor.getValue().replace("\n\n" + self.rules.get(rule.type).generateRuleString(rule), ""));
            }
        }
        if (shape) {
            self.rules.get(rule.type).unapplyRule(rule, shape.shape);
            self.rules.get(rule.type).removePreview(shape.shape);
        }
    }

    self.updateRule = function (shape, oldrule, newrule) {
        if (!oldrule) return;
        if (!newrule) return;
        if (!shape) return;
        var index;
        if (!newrule.wasParsed || newrule.edited) {
            index = tmpRules.indexOf(oldrule)
            if (index != -1) {
                tmpRules.splice(index, 1);
                tmpRules.push(newrule);
            }
        }

        self.rules.get(oldrule.type).unapplyRule(oldrule, shape);
        self.rules.get(oldrule.type).removePreview(shape);
        self.rules.get(newrule.type).applyRule(newrule, shape);
        self.rules.get(newrule.type).addPreview(shape);

        var editor = ace.edit("code_text_ace");
        var newString = self.rules.get(newrule.type).generateRuleString(newrule);
        
        if (newrule.wasParsed && !newrule.edited) {
            var oldstr = editor.getValue();
            var ruleLength = uneditedRule.end - uneditedRule.start;
            editor.setValue(oldstr.substr(0, uneditedRule.start) + oldstr.substr(uneditedRule.end), 1);

            var index = renderer.ruleIndex;
            parsedRules[index].edited = true;
            newrule.edited = true;
            for (var j = index + 1; j < parsedRules.length; j++) {
                parsedRules[j].start -= ruleLength;
                parsedRules[j].end -= ruleLength;
            }
            editor.setValue(editor.getValue() + "\n\n" + self.rules.get(newrule.type).generateRuleString(newrule), 1);
            tmpRules.push(newrule);
        } else {
            var oldString = self.rules.get(oldrule.type).generateRuleString(oldrule);
            editor.setValue(editor.getValue().replace(oldString, newString));
        }
    }

    self.parseRule = function (ruleBuffer) {
        var ruleType = ruleBuffer[0].Text;
        var rule = self.rules.get(ruleType);
        if (!rule) {
            var parsedRule = { type: 'ruleNotFound' };
            var position = 0;
        } else {
            [parsedRule, position] = rule.parseCode(ruleBuffer);
            var counter = position;
            while (counter < ruleBuffer.length) {
                if (ruleBuffer[position].Text == "Mode") {

                }
                counter += 1;
            }
        }
        return [parsedRule, position];
    }

    self.setParsedRules = function(rules) {
        parsedRules = rules;
    }

    self.getParsedRules = function () {
        return parsedRules;
    }

    self.getRuleHistory = function (shape) {
        return self.getAllTmpRules[shape.id];
    }

    self.getAllTmpRules = function () {
        return tmpRules;
    }

    self.getRuleByIndex = function (indey) {
        return tmpRules[index];
    }

    addPreview = function (shape) {
        var geo, matrix;
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

    }

    removePreview = function (shape) {
        self.previewScene.remove(meshes[shape.id]);
        meshes.delete(shape.id);
    }

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
    }

    appendModeSelector = function (parentDiv) {
        var innerHTML = '<select id="mode_selector">';
        innerHTML += '<option value="Mode.Local">Local</option>';
        innerHTML += '<option value="Mode.LocalMid">LocalMid</option>';
        innerHTML += '<option value="Mode.Global">Global</option>';
        innerHTML += '<option value="Mode.GlobalMid">GlobalMid</option>';
        innerHTML += '</select>'
        parentDiv.innerHTML += innerHTML;
        $('#mode_selector').change(inputChanged);
    }
    setModeSelector = function (target) {
        if (!target.startsWith("Mode.")) target = "Mode." + target;
        var selector = document.getElementById("mode_selector");
        for (i = 0; i < selector.options.length; i++) {
            if (selector.options[i].value == target)
                selector.selectedIndex = i;
        }
    }
    getMode = function () {
        var selector = document.getElementById("mode_selector");
        return selector.options[selector.selectedIndex].value;
    }

    addTags = function (rule, ruleString, indentation) { return renderer.postfixController.appendPostfixString(rule, ruleString, indentation); }
    readTags = function (parentDiv, parentObject) { return renderer.postfixController.applyPostfixes(parentDiv, parentObject); }

    inputChanged = function () { renderer.inputChanged(); }

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
            abstractRule.generateRuleString = function (rule) {
                var ruleString = "string generation not implemented yet";
                return ruleString;
            };
            abstractRule.generateShortString = function (rule) {
                return "short not implemented yet";
            };
            abstractRule.applyRule = function (rule, shape) {
            };
            abstractRule.unapplyRule = function (rule, shape) {
            };
            abstractRule.appendInputFields = function (parentDiv, rule) {
            };
            abstractRule.createRuleDescriptor = function (oldRule) {
                if (oldRule) return oldRule;
                var rule = {
                    type: "Dummy"
                }
                return rule;
            };
            abstractRule.draggingHelpers = {
            };
            abstractRule.createHandles = function (scene, shape) {
                this.draggingHelpers.scene = scene;
                var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                var ids = buildStandardAxes(scene, shape, colors, true);
            };
            abstractRule.onMouseOverHandle = function (id) {
            };
            abstractRule.onMouseNotOverHandle = function () {
            };
            abstractRule.onHandlePressed = function (id, mouse, intersection, scene, camera) {
            };
            abstractRule.onHandleDragged = function (mouse) {
            };
            abstractRule.onHandleReleased = function () {
            };
            abstractRule.addPreview = addPreview;
            abstractRule.removePreview = removePreview;
            abstractRule.parseCode = function (ruleBuffer) {
                var rule = {
                    type: "parseNotImplemented"
                }
                return [rule, 0];
            };
            abstractRule.generatesMultipleShapes = false;
        }


        // #################################################################################################################################
        // ################################################# CUSTOM ########################################################################
        // #################################################################################################################################

        {
            /*

            config = {
                type: String,
                mode: bool,
                options: [
                    {
                        label: String | null,
                        inputType: INPUTTYPE,
                        values: [...] | null
                    },
                    ...
                ]
            }

            inputType - values_type:
            DROPDOWN - [option1, option2, ...]
            VEC3 - [x,y,z]
            STRING - string
            TAG - string
            RAW - string
            DOUBLE - double
            TAGS - [tag1, tag2, ...]            

            */
            generateCustomRule = function (config) {

                var customRule = jQuery.extend(true, [], abstractRule);

                customRule.generateRuleString = function (rule) {
                    var ruleString = "new Rules." + config.type + "(";

                    ruleString += customRule.addSelectionsString(rule);

                    if (config.mode && rule.mode) {
                        ruleString += ', ' + rule.mode;
                    }
                    ruleString += ")";
                    ruleString = addTags(rule, ruleString);
                    ruleString += ";";
                    return ruleString;
                };

                customRule.generateShortString = function (rule) {
                    var ruleString = config.type + " with (";

                    ruleString += customRule.addSelectionsString(rule);

                    if (config.mode && rule.mode) {
                        ruleString += ', ' + rule.mode;
                    }
                    ruleString += ")";
                    return ruleString;
                };

                customRule.addSelectionsString = function (rule) {
                    var ruleString = '';
                    for (var i = 0; i < config.options.length; i++) {
                        var current = rule.selections[i];
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
                                ruleString += current[0] + ', ' + current[1] + ', ' + current[2];
                                ruleString += ')';
                                break;

                            default:
                                break;

                        }
                        ruleString += ", ";
                    }
                    ruleString = ruleString.slice(0, -2);
                    return ruleString;
                }

                customRule.afterInputCreation = function (parentDiv, rule) { };

                customRule.onselectionChange = inputChanged;

                customRule.appendInputFields = function (parentDiv, rule) {
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
                                if (rule && rule.selections[i]) var settings = rule.selections[i]
                                else var settings = null;
                                renderer.postfixController.addPostfix(parentDiv, settings, current.label, false, customRule.onselectionChange);
                                break;

                            case INPUTTYPE.TAGS:
                                if (rule && rule.selections[i]) var settings = rule.selections[i]
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
                        if (rule) if (rule.mode) setModeSelector(rule.mode);
                        else setModeSelector("Local");
                    }

                    for (var i = 0; i < config.options.length; i++) {
                        // add listeners
                        switch (config.options[i].inputType) {

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
                        switch (config.options[i].inputType) {
                            case INPUTTYPE.STRING:
                            case INPUTTYPE.DOUBLE:
                            case INPUTTYPE.RAW:
                                var id = "input_field" + i;
                                input = document.getElementById(id);
                                if (rule) {
                                    input.value = rule.selections[i];
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
                                if (rule) {
                                    var selector = document.getElementById(id);
                                    for (j = 0; j < selector.options.length; j++) {
                                        if (selector.options[j].label == rule.selections[i])
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
                                if (rule) {
                                    input0.value = rule.selections[i][0];
                                    input1.value = rule.selections[i][1];
                                    input2.value = rule.selections[i][2];
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

                    customRule.afterInputCreation(parentDiv, rule);

                    customRule.onselectionChange();
                };

                customRule.createRuleDescriptor = function (oldRule) {
                    if (oldRule) {
                        var rule  = jQuery.extend(true, {}, oldRule)
                    } else {
                        var rule = {};
                    }
                    rule.tags = {};
                    rule.selections = [];
                    rule.type = config.type;
                    rule.mode = null;

                    if (config.mode) {
                        rule.mode = getMode();
                    }

                    for (var i = 0; i < config.options.length; i++) {
                        switch (config.options[i].inputType) {

                            case INPUTTYPE.STRING:
                            case INPUTTYPE.RAW:
                                var id = "input_field" + i;
                                input = document.getElementById(id);
                                rule.selections.push(input.value);
                                break;

                            case INPUTTYPE.DOUBLE:
                                var id = "input_field" + i;
                                input = document.getElementById(id);
                                rule.selections.push(parseFloat(input.value));
                                break;

                            case INPUTTYPE.DROPDOWN:
                                var id = "dropdown" + i;
                                selector = document.getElementById(id);
                                rule.selections.push(selector.options[selector.selectedIndex].label);
                                break;

                            case INPUTTYPE.TAG:
                                var div = document.getElementById('inputDiv');
                                rule.selections.push({});
                                renderer.postfixController.applyPostfixes(div, rule.selections[i]);
                                break;

                            case INPUTTYPE.TAGS:
                                var div = document.getElementById('inputDiv');
                                rule.selections.push({});
                                renderer.postfixController.applyPostfixes(div, rule.selections[i]);
                                break;

                            case INPUTTYPE.VEC3:
                                var id = "vec3_" + i + "_elem0";
                                input0 = document.getElementById(id);
                                id = "vec3_" + i + "_elem1";
                                input1 = document.getElementById(id);
                                id = "vec3_" + i + "_elem2";
                                input2 = document.getElementById(id);
                                var vec = [input0.value, input1.value, input2.value];
                                rule.selections.push(vec);
                                break;

                            default:
                                break;

                        }
                    }

                    return rule;
                };

                customRule.createHandles = function (scene, shape) { };

                customRule.parseCode = function (ruleBuffer) {
                    var rule = {
                        type: config.type,
                        selections: []
                    };

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
                                    rule.selections.push(current.Text.substring(1, (current.Text.length-1)));
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
                                    if (minus) rule.selections.push('-' + current.Text);
                                    else rule.selections.push(current.Text);
                                    minus = false;
                                    optionIndex += 1;
                                }
                                counter += 1;
                                break;

                            case INPUTTYPE.DROPDOWN:
                                if (current.RawKind == 8508) {
                                    if (ruleBuffer[counter + 1].Text == '.' && ruleBuffer[counter + 2].RawKind == 8508) {
                                        rule.selections.push(current.Text + '.' + ruleBuffer[counter + 2].Text);
                                        counter += 3;
                                    } else {
                                        rule.selections.push(current.Text);
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
                                    if (minus) rule.selections.push('-' + current.Text);
                                    else rule.selections.push(current.Text);
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
                                    if (minus) vec3.push('-' + current.Text)
                                    else vec3.push(current.Text)
                                    minus = false;
                                } else if (current.Text == ")" && current.RawKind == 8201) {
                                    rule.selections.push(vec3);
                                    optionIndex += 1;
                                }
                                counter += 1;
                                break;

                            default:
                                counter += 1;
                                break;

                        }
                    }

                    return [rule, counter];
                };

                return customRule;

            }
        }

        // #################################################################################################################################
        // ############################################ TRANSLATION ########################################################################
        // #################################################################################################################################

        {
            var translateConfig = {
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

            var translation = generateCustomRule(translateConfig);

            translation.applyRule = function (rule, shape) {
                var matrix = new THREE.Matrix4();
                matrix.makeTranslation(parseFloat(rule.selections[0][0]), parseFloat(rule.selections[0][1]), parseFloat(rule.selections[0][2]));
                mat = shape.appearance.transformation;
                var m = new THREE.Matrix4().fromArray(mat).transpose();
                if (rule.mode == "Mode.Local" || rule.mode == "Mode.LocalMid") m.premultiply(matrix);
                if (rule.mode == "Mode.Global" || rule.mode == "Mode.GlobalMid") m.multiply(matrix);
                shape.appearance.transformation = m.transpose().toArray();
            };
            translation.unapplyRule = function (rule, shape) {
                var matrix = new THREE.Matrix4();
                matrix.makeTranslation(-parseFloat(rule.selections[0][0]), -parseFloat(rule.selections[0][1]), -parseFloat(rule.selections[0][2]));
                mat = shape.appearance.transformation;
                var m = new THREE.Matrix4().fromArray(mat).transpose();
                if (rule.mode == "Mode.Local" || rule.mode == "Mode.LocalMid") m.premultiply(matrix);
                if (rule.mode == "Mode.Global" || rule.mode == "Mode.GlobalMid") m.multiply(matrix);
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
                this.draggingHelpers.scene = scene;

                var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                var toSwitch = null;
                if (this.draggingHelpers.activeHandle) toSwitch = this.draggingHelpers.activeHandle;
                else if (this.draggingHelpers.overHandle) toSwitch = this.draggingHelpers.overHandle;
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
                this.draggingHelpers.ids.x = ids[0];
                this.draggingHelpers.ids.y = ids[1];
                this.draggingHelpers.ids.z = ids[2];
            };
            translation.onMouseOverHandle = function (id) {
                oldHandle = this.draggingHelpers.overHandle;
                if (this.draggingHelpers.ids.x <= id && id <= this.draggingHelpers.ids.x + 2) {
                    this.draggingHelpers.overHandle = 'x';
                }
                if (this.draggingHelpers.ids.y <= id && id <= this.draggingHelpers.ids.y + 2) {
                    this.draggingHelpers.overHandle = 'y';
                }
                if (this.draggingHelpers.ids.z <= id && id <= this.draggingHelpers.ids.z + 2) {
                    this.draggingHelpers.overHandle = 'z';
                }
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            translation.onMouseNotOverHandle = function () {
                oldHandle = this.draggingHelpers.overHandle;
                this.draggingHelpers.overHandle = null;
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            translation.onHandlePressed = function (id, mouse, intersection, scene, camera) {
                var arrowPos = scene.getObjectById(id).parent.position;
                var initStart = arrowPos.clone();
                var initEnd = intersection.clone();
                var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                this.draggingHelpers.segment = {
                    start: start,
                    end: end
                }

                this.draggingHelpers.startValues.x = parseFloat(document.getElementById("vec3_0_elem0").value);
                this.draggingHelpers.startValues.y = parseFloat(document.getElementById("vec3_0_elem1").value);
                this.draggingHelpers.startValues.z = parseFloat(document.getElementById("vec3_0_elem2").value);
                this.draggingHelpers.cam = camera;
                this.draggingHelpers.intersection = intersection;
                this.draggingHelpers.arrowPos = arrowPos;

                if (this.draggingHelpers.ids.x <= id && id <= this.draggingHelpers.ids.x + 2) {
                    this.draggingHelpers.activeHandle = 'x';
                }
                if (this.draggingHelpers.ids.y <= id && id <= this.draggingHelpers.ids.y + 2) {
                    this.draggingHelpers.activeHandle = 'y';
                }
                if (this.draggingHelpers.ids.z <= id && id <= this.draggingHelpers.ids.z + 2) {
                    this.draggingHelpers.activeHandle = 'z';
                }
            };
            translation.onHandleDragged = function (mouse) {
                var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                mousePoint.unproject(this.draggingHelpers.cam);
                var mouseRay = new THREE.Ray(this.draggingHelpers.cam.position, mousePoint.sub(this.draggingHelpers.cam.position).normalize());

                var targetPoint = new THREE.Vector3();
                mouseRay.distanceSqToSegment(this.draggingHelpers.segment.start,
                    this.draggingHelpers.segment.end,
                    null,
                    targetPoint);

                var diff = targetPoint.sub(this.draggingHelpers.intersection);
                var length = diff.length();
                var direction = this.draggingHelpers.intersection.clone().sub(this.draggingHelpers.arrowPos);
                var angle = diff.normalize().angleTo(direction.normalize());
                if (angle > (0.5 * Math.PI)) length *= -1;

                switch (this.draggingHelpers.activeHandle) {
                    case 'x':
                        xInput = document.getElementById("vec3_0_elem0").value = '' + (this.draggingHelpers.startValues.x + length).round();
                        break;
                    case 'y':
                        yInput = document.getElementById("vec3_0_elem1").value = '' + (this.draggingHelpers.startValues.y + length).round();
                        break;
                    case 'z':
                        zInput = document.getElementById("vec3_0_elem2").value = '' + (this.draggingHelpers.startValues.z + length).round();
                        break;
                }
                inputChanged();
            };
            translation.onHandleReleased = function () {
                oldHandle = this.draggingHelpers.activeHandle;
                this.draggingHelpers.activeHandle = null;
                if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
            };
        }


        // #################################################################################################################################
        // ################################################## SCALE ########################################################################
        // #################################################################################################################################

        {
            var scaleConfig = {
                type: 'Scale',
                mode: true,
                options: [
                    {
                        label: 'Vector',
                        inputType: INPUTTYPE.VEC3,
                        values: [1, 1, 1]
                    }
                ]
            }
            var scale = generateCustomRule(scaleConfig);
            
            scale.applyRule = function (rule, shape) {
                var matrix = new THREE.Matrix4();
                matrix.makeScale(parseFloat(rule.selections[0][0]), parseFloat(rule.selections[0][1]), parseFloat(rule.selections[0][2]));
                mat = shape.appearance.transformation;
                var m = new THREE.Matrix4().fromArray(mat).transpose();
                if (rule.mode == "Mode.Local" || rule.mode == "Mode.LocalMid") m.premultiply(matrix);
                if (rule.mode == "Mode.Global" || rule.mode == "Mode.GlobalMid") m.multiply(matrix);
                shape.appearance.transformation = m.transpose().toArray();
            };
            scale.unapplyRule = function (rule, shape) {
                var matrix = new THREE.Matrix4();
                matrix.makeScale(1 / parseFloat(rule.selections[0][0]), 1 / parseFloat(rule.selections[0][1]), 1 / parseFloat(rule.selections[0][2]));
                mat = shape.appearance.transformation;
                var m = new THREE.Matrix4().fromArray(mat).transpose();
                if (rule.mode == "Mode.Local" || rule.mode == "Mode.LocalMid") m.premultiply(matrix);
                if (rule.mode == "Mode.Global" || rule.mode == "Mode.GlobalMid") m.multiply(matrix);
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
                this.draggingHelpers.scene = scene;

                var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                var toSwitch = null;
                if (this.draggingHelpers.activeHandle) toSwitch = this.draggingHelpers.activeHandle;
                else if (this.draggingHelpers.overHandle) toSwitch = this.draggingHelpers.overHandle;
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
                this.draggingHelpers.sizeX = xDir.length();
                this.draggingHelpers.sizeY = yDir.length();
                this.draggingHelpers.sizeZ = zDir.length();

                var ids = buildStandardAxes(scene, shape, colors);
                this.draggingHelpers.ids.x = ids[0];
                this.draggingHelpers.ids.y = ids[1];
                this.draggingHelpers.ids.z = ids[2];
            };
            scale.onMouseOverHandle = function (id) {
                oldHandle = this.draggingHelpers.overHandle;
                if (this.draggingHelpers.ids.x <= id && id <= this.draggingHelpers.ids.x + 2) {
                    this.draggingHelpers.overHandle = 'x';
                }
                if (this.draggingHelpers.ids.y <= id && id <= this.draggingHelpers.ids.y + 2) {
                    this.draggingHelpers.overHandle = 'y';
                }
                if (this.draggingHelpers.ids.z <= id && id <= this.draggingHelpers.ids.z + 2) {
                    this.draggingHelpers.overHandle = 'z';
                }
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            scale.onMouseNotOverHandle = function () {
                oldHandle = this.draggingHelpers.overHandle;
                this.draggingHelpers.overHandle = null;
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            scale.onHandlePressed = function (id, mouse, intersection, scene, camera) {
                var arrowPos = scene.getObjectById(id).parent.position;
                var initStart = arrowPos.clone();
                var initEnd = intersection.clone();
                var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                this.draggingHelpers.segment = {
                    start: start,
                    end: end
                }

                this.draggingHelpers.startValues.x = parseFloat(document.getElementById("vec3_0_elem0").value);
                this.draggingHelpers.startValues.y = parseFloat(document.getElementById("vec3_0_elem1").value);
                this.draggingHelpers.startValues.z = parseFloat(document.getElementById("vec3_0_elem2").value);
                this.draggingHelpers.cam = camera;
                this.draggingHelpers.intersection = intersection;
                this.draggingHelpers.arrowPos = arrowPos;

                this.draggingHelpers.startSizeX = this.draggingHelpers.sizeX;
                this.draggingHelpers.startSizeY = this.draggingHelpers.sizeY;
                this.draggingHelpers.startSizeZ = this.draggingHelpers.sizeZ;

                if (this.draggingHelpers.ids.x <= id && id <= this.draggingHelpers.ids.x + 2) {
                    this.draggingHelpers.activeHandle = 'x';
                }
                if (this.draggingHelpers.ids.y <= id && id <= this.draggingHelpers.ids.y + 2) {
                    this.draggingHelpers.activeHandle = 'y';
                }
                if (this.draggingHelpers.ids.z <= id && id <= this.draggingHelpers.ids.z + 2) {
                    this.draggingHelpers.activeHandle = 'z';
                }
            };
            scale.onHandleDragged = function (mouse) {
                var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                mousePoint.unproject(this.draggingHelpers.cam);
                var mouseRay = new THREE.Ray(this.draggingHelpers.cam.position, mousePoint.sub(this.draggingHelpers.cam.position).normalize());

                var targetPoint = new THREE.Vector3();
                mouseRay.distanceSqToSegment(this.draggingHelpers.segment.start,
                    this.draggingHelpers.segment.end,
                    null,
                    targetPoint);

                var diff = targetPoint.sub(this.draggingHelpers.intersection);
                var length = diff.length();
                var direction = this.draggingHelpers.intersection.clone().sub(this.draggingHelpers.arrowPos);
                var angle = diff.normalize().angleTo(direction.normalize());
                if (angle > (0.5 * Math.PI)) length *= -1;

                switch (this.draggingHelpers.activeHandle) {
                    case 'x':
                        var newSize = this.draggingHelpers.startSizeX * this.draggingHelpers.startValues.x + length;
                        var scale = newSize / this.draggingHelpers.startSizeX;
                        document.getElementById("vec3_0_elem0").value = scale.round();
                        break;
                    case 'y':
                        var scale = this.draggingHelpers.startSizeY * this.draggingHelpers.startValues.y + length;
                        scale = scale / this.draggingHelpers.startSizeY;
                        document.getElementById("vec3_0_elem1").value = scale.round();
                        break;
                    case 'z':
                        var scale = this.draggingHelpers.startSizeZ * this.draggingHelpers.startValues.z + length;
                        scale = scale / this.draggingHelpers.startSizeZ;
                        document.getElementById("vec3_0_elem2").value = scale.round();
                        break;
                }
                inputChanged();
            };
            scale.onHandleReleased = function () {
                oldHandle = this.draggingHelpers.activeHandle;
                this.draggingHelpers.activeHandle = null;
                if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
            };
        }


        // #################################################################################################################################
        // ################################################## GROW #########################################################################
        // #################################################################################################################################

        {
            var growConfig = {
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
            var grow = generateCustomRule(growConfig);
    
            grow.applyRule = function (rule, shape) {
                var transform = shape.appearance.transformation;
                var xDir = new THREE.Vector3(transform[0], transform[1], transform[2]);
                var yDir = new THREE.Vector3(transform[4], transform[5], transform[6]);
                var zDir = new THREE.Vector3(transform[8], transform[9], transform[10]);
                var sizeX = xDir.length();
                var sizeY = yDir.length();
                var sizeZ = zDir.length();
                var scaleX = 1 + parseFloat(rule.selections[0][0]) / sizeX;
                var scaleY = 1 + parseFloat(rule.selections[0][1]) / sizeY;
                var scaleZ = 1 + parseFloat(rule.selections[0][2]) / sizeZ;

                var matrix = new THREE.Matrix4();
                matrix.makeScale(scaleX, scaleY, scaleZ);
                mat = shape.appearance.transformation;
                var m = new THREE.Matrix4().fromArray(mat).transpose();
                if (rule.mode == "Mode.Local" || rule.mode == "Mode.LocalMid") m.premultiply(matrix);
                if (rule.mode == "Mode.Global" || rule.mode == "Mode.GlobalMid") m.multiply(matrix);
                shape.appearance.transformation = m.transpose().toArray();
            };
            grow.unapplyRule = function (rule, shape) {
                var transform = shape.appearance.transformation;
                var xDir = new THREE.Vector3(transform[0], transform[1], transform[2]);
                var yDir = new THREE.Vector3(transform[4], transform[5], transform[6]);
                var zDir = new THREE.Vector3(transform[8], transform[9], transform[10]);
                var sizeX = xDir.length();
                var sizeY = yDir.length();
                var sizeZ = zDir.length();
                var scaleX = sizeX / (sizeX - parseFloat(rule.selections[0][0]));
                var scaleY = sizeY / (sizeY - parseFloat(rule.selections[0][1]));
                var scaleZ = sizeZ / (sizeZ - parseFloat(rule.selections[0][2]));

                var matrix = new THREE.Matrix4();
                matrix.makeScale(1 / scaleX, 1 / scaleY, 1 / scaleZ);
                mat = shape.appearance.transformation;
                var m = new THREE.Matrix4().fromArray(mat).transpose();
                if (rule.mode == "Mode.Local" || rule.mode == "Mode.LocalMid") m.premultiply(matrix);
                if (rule.mode == "Mode.Global" || rule.mode == "Mode.GlobalMid") m.multiply(matrix);
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
                this.draggingHelpers.scene = scene;

                var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                var toSwitch = null;
                if (this.draggingHelpers.activeHandle) toSwitch = this.draggingHelpers.activeHandle;
                else if (this.draggingHelpers.overHandle) toSwitch = this.draggingHelpers.overHandle;
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
                this.draggingHelpers.sizeX = xDir.length();
                this.draggingHelpers.sizeY = yDir.length();
                this.draggingHelpers.sizeZ = zDir.length();

                var ids = buildStandardAxes(scene, shape, colors);
                this.draggingHelpers.ids.x = ids[0];
                this.draggingHelpers.ids.y = ids[1];
                this.draggingHelpers.ids.z = ids[2];
            };
            grow.onMouseOverHandle = function (id) {
                oldHandle = this.draggingHelpers.overHandle;
                if (this.draggingHelpers.ids.x <= id && id <= this.draggingHelpers.ids.x + 2) {
                    this.draggingHelpers.overHandle = 'x';
                }
                if (this.draggingHelpers.ids.y <= id && id <= this.draggingHelpers.ids.y + 2) {
                    this.draggingHelpers.overHandle = 'y';
                }
                if (this.draggingHelpers.ids.z <= id && id <= this.draggingHelpers.ids.z + 2) {
                    this.draggingHelpers.overHandle = 'z';
                }
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            grow.onMouseNotOverHandle = function () {
                oldHandle = this.draggingHelpers.overHandle;
                this.draggingHelpers.overHandle = null;
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            grow.onHandlePressed = function (id, mouse, intersection, scene, camera) {
                var arrowPos = scene.getObjectById(id).parent.position;
                var initStart = arrowPos.clone();
                var initEnd = intersection.clone();
                var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                this.draggingHelpers.segment = {
                    start: start,
                    end: end
                }

                this.draggingHelpers.startValues.x = parseFloat(document.getElementById("vec3_0_elem0").value);
                this.draggingHelpers.startValues.y = parseFloat(document.getElementById("vec3_0_elem1").value);
                this.draggingHelpers.startValues.z = parseFloat(document.getElementById("vec3_0_elem2").value);
                this.draggingHelpers.cam = camera;
                this.draggingHelpers.intersection = intersection;
                this.draggingHelpers.arrowPos = arrowPos;

                this.draggingHelpers.startSizeX = this.draggingHelpers.sizeX;
                this.draggingHelpers.startSizeY = this.draggingHelpers.sizeY;
                this.draggingHelpers.startSizeZ = this.draggingHelpers.sizeZ;

                if (this.draggingHelpers.ids.x <= id && id <= this.draggingHelpers.ids.x + 2) {
                    this.draggingHelpers.activeHandle = 'x';
                }
                if (this.draggingHelpers.ids.y <= id && id <= this.draggingHelpers.ids.y + 2) {
                    this.draggingHelpers.activeHandle = 'y';
                }
                if (this.draggingHelpers.ids.z <= id && id <= this.draggingHelpers.ids.z + 2) {
                    this.draggingHelpers.activeHandle = 'z';
                }
            };
            grow.onHandleDragged = function (mouse) {
                var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                mousePoint.unproject(this.draggingHelpers.cam);
                var mouseRay = new THREE.Ray(this.draggingHelpers.cam.position, mousePoint.sub(this.draggingHelpers.cam.position).normalize());

                var targetPoint = new THREE.Vector3();
                mouseRay.distanceSqToSegment(this.draggingHelpers.segment.start,
                    this.draggingHelpers.segment.end,
                    null,
                    targetPoint);

                var diff = targetPoint.sub(this.draggingHelpers.intersection);
                var length = diff.length();
                var direction = this.draggingHelpers.intersection.clone().sub(this.draggingHelpers.arrowPos);
                var angle = diff.normalize().angleTo(direction.normalize());
                if (angle > (0.5 * Math.PI)) length *= -1;

                switch (this.draggingHelpers.activeHandle) {
                    case 'x':
                        var scale = this.draggingHelpers.startSizeX + length;
                        scale = scale / this.draggingHelpers.startSizeX;
                        var grow = scale * this.draggingHelpers.sizeX - this.draggingHelpers.sizeX;
                        document.getElementById("vec3_0_elem0").value = (this.draggingHelpers.startValues.x + length).round();
                        break;
                    case 'y':
                        var scale = this.draggingHelpers.startSizeY + length;
                        scale = scale / this.draggingHelpers.startSizeY;
                        var grow = scale * this.draggingHelpers.sizeY - this.draggingHelpers.sizeY;
                        document.getElementById("vec3_0_elem1").value = (this.draggingHelpers.startValues.y + length).round();
                        break;
                    case 'z':
                        var scale = this.draggingHelpers.startSizeZ + length;
                        scale = scale / this.draggingHelpers.startSizeZ;
                        var grow = scale * this.draggingHelpers.sizeZ - this.draggingHelpers.sizeZ;
                        document.getElementById("vec3_0_elem2").value = (this.draggingHelpers.startValues.z + length).round();
                        break;
                }
                inputChanged();
            };
            grow.onHandleReleased = function () {
                oldHandle = this.draggingHelpers.activeHandle;
                this.draggingHelpers.activeHandle = null;
                if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
            };
        }

        // #################################################################################################################################
        // ################################################## SIZE #########################################################################
        // #################################################################################################################################

        {
            var axes = ["Axis.X", "Axis.Y", "Axis.Z"];
            var sizeConfig = {
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
            }

            var sizeRule = generateCustomRule(sizeConfig);

            sizeRule.changedAxis = function () {
                var selector = document.getElementById('dropdown0');
                selection = selector.options[selector.selectedIndex].label;
                switch (selection) {
                    case 'Axis.X':
                        sizeRule.draggingHelpers.initialSize = sizeRule.draggingHelpers.initialSizeX;
                        break;
                    case 'Axis.Y':
                        sizeRule.draggingHelpers.initialSize = sizeRule.draggingHelpers.initialSizeY;
                        break;
                    case 'Axis.Z':
                        sizeRule.draggingHelpers.initialSize = sizeRule.draggingHelpers.initialSizeZ;
                        break;
                    default:
                        break;
                }
                sizeRule.onselectionChange();
            };

            sizeRule.afterInputCreation = function (parentDiv, rule) {
                var input = document.getElementById('input_field1');
                if (rule) {
                    this.draggingHelpers.initialSize = rule.initialSize;
                    input.value = rule.selections[1];
                } else {
                    this.draggingHelpers.initialSize = null;
                    input.value = 2;
                }

                var id = "dropdown0";
                var selector = document.getElementById(id);
                selector.addEventListener("change", sizeRule.changedAxis);
            }

            sizeRule.createRuleDescriptor = function () {
                var rule = {
                    type: 'Size',
                    selections: []
                }

                rule.mode = getMode();

                var id = "dropdown0";
                selector = document.getElementById(id);
                rule.selections.push(selector.options[selector.selectedIndex].label);

                var id = "input_field1";
                input = document.getElementById(id);
                rule.selections.push(input.value);

                rule.initialSize = this.draggingHelpers.initialSize;

                return rule;
            };

            sizeRule.applyRule = function (rule, shape) {
                var matrix = new THREE.Matrix4();

                if (!rule.initialSize) {
                    var m = shape.appearance.transformation;
                    var selection = rule.selections[0]
                    if (selection == 'Axis.X') {
                        var dir = new THREE.Vector3(m[0], m[1], m[2]);
                    } else if (selection == 'Axis.Y') {
                        var dir = new THREE.Vector3(m[4], m[5], m[6]);
                    } else {
                        var dir = new THREE.Vector3(m[8], m[9], m[10]);
                    }
                    rule.initialSize = dir.length();
                }
                
                var scale = rule.selections[1] / rule.initialSize;
                switch(rule.selections[0]) {
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
                if (rule.mode == "Mode.Local" || rule.mode == "Mode.LocalMid") m.premultiply(matrix);
                if (rule.mode == "Mode.Global" || rule.mode == "Mode.GlobalMid") m.multiply(matrix);
                shape.appearance.transformation = m.transpose().toArray();
            };
            sizeRule.unapplyRule = function (rule, shape) {
                var matrix = new THREE.Matrix4();
                
                var scale = rule.initialSize / rule.selections[1];
                switch(rule.selections[0]) {
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
                if (rule.mode == "Mode.Local" || rule.mode == "Mode.LocalMid") m.premultiply(matrix);
                if (rule.mode == "Mode.Global" || rule.mode == "Mode.GlobalMid") m.multiply(matrix);
                shape.appearance.transformation = m.transpose().toArray();
            };

            sizeRule.createHandles = function (scene, shape) {

                // necessary calculations
                var m = shape.shape.appearance.transformation;
                var selector = document.getElementById('dropdown0');
                var selection = selector[selector.selectedIndex].label;

                if (!this.draggingHelpers.initialSizeX) {
                    var dir = new THREE.Vector3(m[0], m[1], m[2]);
                    this.draggingHelpers.initialSizeX = dir.length();
                }
                if (!this.draggingHelpers.initialSizeY) {
                    var dir = new THREE.Vector3(m[4], m[5], m[6]);
                    this.draggingHelpers.initialSizeY = dir.length();
                }
                if (!this.draggingHelpers.initialSizeZ) {
                    var dir = new THREE.Vector3(m[8], m[9], m[10]);
                    this.draggingHelpers.initialSizeZ = dir.length();
                }

                if (!this.draggingHelpers.initialSize) {
                    if (selection == 'Axis.X') {
                        this.draggingHelpers.initialSize = this.draggingHelpers.initialSizeX;
                    } else if (selection == 'Axis.Y') {
                        this.draggingHelpers.initialSize = this.draggingHelpers.initialSizeY;
                    } else {
                        this.draggingHelpers.initialSize = this.draggingHelpers.initialSizeZ;
                    }
                }
                
                if (this.draggingHelpers.activeHandle) {
                    document.getElementById("input_field1").value = this.draggingHelpers.size.round();
                }

                //create handles

                var basicColors = [0xAA3030, 0x30AA30, 0x3030AA];
                var highlightColors = [0xFF0000, 0x00FF00, 0x0000FF];

                mat = shape.shape.appearance.transformation;
                var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                center = new THREE.Vector3(0, 0, 0);
                center.applyProjection(m);

                var dir, offset;
                var currentInput = document.getElementById("input_field1").value;
                switch (this.draggingHelpers.axis) {
                    case 'Axis.X':
                        dir = new THREE.Vector3(1.0, 0, 0);
                        offset = new THREE.Vector3(currentInput, 0, 0);
                        break;
                    case 'Axis.Y':
                        dir = new THREE.Vector3(0, 1.0, 0);
                        offset = new THREE.Vector3(0, currentInput, 0);
                        break;
                    case 'Axis.Z':
                        dir = new THREE.Vector3(0, 0, 1.0);
                        offset = new THREE.Vector3(0, 0, currentInput);
                        break;
                    default:
                        break;
                }

                dir.applyProjection(m);
                dir.sub(center);


                /*
                switch (this.draggingHelpers.axis) {
                    case 'Axis.X':
                        center.add(new THREE.Vector3(-this.draggingHelpers.fullSize / 2, -this.draggingHelpers.width / 2 - widthOffset / 2, -this.draggingHelpers.height / 2 - heightOffset / 2));
                        break;
                    case 'Axis.Y':
                        center.add(new THREE.Vector3(-this.draggingHelpers.width / 2 - widthOffset / 2, -this.draggingHelpers.fullSize / 2, -this.draggingHelpers.height / 2 - heightOffset / 2));
                        break;
                    case 'Axis.Z':
                        center.add(new THREE.Vector3(-this.draggingHelpers.width / 2 - widthOffset / 2, -this.draggingHelpers.height / 2 - heightOffset / 2, -this.draggingHelpers.fullSize / 2));
                        break;
                    default:
                        break;
                }
                */

                this.draggingHelpers.highlight = null;
                var search = 0;
                if (!this.draggingHelpers.arrowIds) this.draggingHelpers.arrowIds = [];
                if (this.draggingHelpers.overHandle) search = this.draggingHelpers.overHandle;
                else if (this.draggingHelpers.activeHandle) search = this.draggingHelpers.activeHandle;
                for (var i = 0; i < this.draggingHelpers.arrowIds.length; i++) {
                    if (this.draggingHelpers.arrowIds[i] <= search && this.draggingHelpers.arrowIds[i] + 2 >= search) {
                        this.draggingHelpers.highlight = Math.floor(i / 2);
                    }
                };

                var oldStartingId = this.draggingHelpers.arrowIds[0] || 0;
                this.draggingHelpers.arrowIds = [];
                var counter = 0;
                for (var i = 0; i < this.draggingHelpers.segments.length - 1; i++) {
                    var size = Math.max(0.000001, this.draggingHelpers.segments[i]);
                    switch (this.draggingHelpers.axis) {
                        case 'Axis.X':
                            center.add(new THREE.Vector3(size, widthOffset, heightOffset));
                            if (counter == this.draggingHelpers.highlight) color = highlightColors[0];
                            else color = basicColors[0];
                            break;
                        case 'Axis.Y':
                            center.add(new THREE.Vector3(widthOffset, size, heightOffset));
                            if (counter == this.draggingHelpers.highlight) color = highlightColors[1];
                            else color = basicColors[1];
                            break;
                        case 'Axis.Z':
                            center.add(new THREE.Vector3(widthOffset, heightOffset, size));
                            if (counter == this.draggingHelpers.highlight) color = highlightColors[2];
                            else color = basicColors[2];
                            break;
                        default:
                            break;
                    }
                    counter++;

                    var arrowlength = Math.max(this.draggingHelpers.fullSize / 5, 0.1);
                    var backarrow = new THREE.ArrowHelper(new THREE.Vector3().sub(dir).normalize(), center, arrowlength, color, 0.2, 0.1);
                    var arrow = new THREE.ArrowHelper(dir.normalize(), center, arrowlength, color, 0.2, 0.1);
                    scene.add(arrow);
                    scene.add(backarrow);

                    this.draggingHelpers.arrowIds.push(arrow.id);
                    this.draggingHelpers.arrowIds.push(backarrow.id);
                }
                this.draggingHelpers.idOffset = this.draggingHelpers.arrowIds[0] - oldStartingId;

            };
            sizeRule.onMouseOverHandle = function (id) {
                oldHandle = this.draggingHelpers.overHandle;
                this.draggingHelpers.overHandle = true;
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            sizeRule.onMouseNotOverHandle = function () {
                oldHandle = this.draggingHelpers.overHandle;
                this.draggingHelpers.overHandle = null;
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            sizeRule.onHandlePressed = function (id, mouse, intersection, scene, camera) {
                var arrowPos = scene.getObjectById(id).parent.position;
                var initStart = arrowPos.clone();
                var initEnd = intersection.clone();
                var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                this.draggingHelpers.segment = {
                    start: start,
                    end: end
                }

                this.draggingHelpers.startValue = parseFloat(document.getElementById("input_field1").value);
                this.draggingHelpers.cam = camera;
                this.draggingHelpers.intersection = intersection;
                this.draggingHelpers.arrowPos = arrowPos;

                this.draggingHelpers.startSize = this.draggingHelpers.size;

                this.draggingHelpers.activeHandle = true;
            };
            sizeRule.onHandleDragged = function (mouse) {
                var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                mousePoint.unproject(this.draggingHelpers.cam);
                var mouseRay = new THREE.Ray(this.draggingHelpers.cam.position, mousePoint.sub(this.draggingHelpers.cam.position).normalize());

                var targetPoint = new THREE.Vector3();
                mouseRay.distanceSqToSegment(this.draggingHelpers.segment.start,
                    this.draggingHelpers.segment.end,
                    null,
                    targetPoint);

                var diff = targetPoint.sub(this.draggingHelpers.intersection);
                var length = diff.length();
                var direction = this.draggingHelpers.intersection.clone().sub(this.draggingHelpers.arrowPos);
                var angle = diff.normalize().angleTo(direction.normalize());
                if (angle > (0.5 * Math.PI)) length *= -1;

                document.getElementById("input_field1").value = (this.draggingHelpers.startValue + length).round();

                inputChanged();
            };
            sizeRule.onHandleReleased = function () {
                oldHandle = this.draggingHelpers.activeHandle;
                this.draggingHelpers.activeHandle = null;
                if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
            };
        }

        // #################################################################################################################################
        // ############################################### ROTATION ########################################################################
        // #################################################################################################################################

        {
            var rotation = jQuery.extend(true, {}, abstractRule)
            rotation.generateRuleString = function (rule) {
                var amount = null;
                if (rule.degrad == "deg") amount = "Deg(" + rule.amount + ")";
                else if (rule.degrad == "rad") amount = "Rad(" + rule.amount + ")";
                var ruleString = "new Rules.Rotate(" + rule.axis + ", " + amount + ", " + rule.mode + ")";
                ruleString = addTags(rule, ruleString);
                ruleString += ";";
                return ruleString;
            };
            rotation.generateShortString = function (rule) {
                return ("Rotation by " + rule.amount + " " + rule.degrad + " on " + rule.axis + ", " + rule.mode);
            };
            rotation.applyRule = function (rule, shape) {
                var amount;
                if (rule.degrad == 'deg') {
                    amount = parseFloat(rule.amount) / 180;
                } else {
                    amount = parseFloat(rule.amount);
                }

                switch (rule.axis) {
                    case 'Axis.X':
                        matrix = new THREE.Matrix4().makeRotationX(Math.PI * amount);
                        break;
                    case 'Axis.Y':
                        matrix = new THREE.Matrix4().makeRotationY(Math.PI * amount);
                        break;
                    case 'Axis.Z':
                        matrix = new THREE.Matrix4().makeRotationZ(Math.PI * amount);
                        break;
                    default:
                        break;
                }

                mat = shape.appearance.transformation;
                var m = new THREE.Matrix4().fromArray(mat);//mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                m.premultiply(matrix);
                shape.appearance.transformation = m.toArray();
            };
            rotation.unapplyRule = function (rule, shape) {
                var amount;
                if (rule.degrad == 'deg') {
                    amount = -1 * parseFloat(rule.amount) / 180;
                } else {
                    amount = -1 * parseFloat(rule.amount);
                }

                switch (rule.axis) {
                    case 'Axis.X':
                        matrix = new THREE.Matrix4().makeRotationX(Math.PI * amount);
                        break;
                    case 'Axis.Y':
                        matrix = new THREE.Matrix4().makeRotationY(Math.PI * amount);
                        break;
                    case 'Axis.Z':
                        matrix = new THREE.Matrix4().makeRotationZ(Math.PI * amount);
                        break;
                    default:
                        break;
                }

                mat = shape.appearance.transformation;
                var m = new THREE.Matrix4().fromArray(mat);//mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                m.premultiply(matrix);
                shape.appearance.transformation = m.toArray();
            };
            rotation.appendInputFields = function (parentDiv, rule) {
                var amount_input = document.createElement("input");
                amount_input.setAttribute('type', 'text');
                amount_input.setAttribute('id', 'amount_input_field');
                if (rule) {
                    amount_input.setAttribute('value', rule.amount);
                } else {
                    amount_input.setAttribute('value', '0');
                }

                var innerHTML = '<select id="axis_selector">';
                innerHTML += '<option value="Axis.X">Axis.X</option>';
                innerHTML += '<option value="Axis.Y">Axis.Y</option>';
                innerHTML += '<option value="Axis.Z">Axis.Z</option>';
                innerHTML += '</select>'

                parentDiv.innerHTML += innerHTML;
                parentDiv.appendChild(amount_input);

                innerHTML = '<select id="degrad_selector">';
                innerHTML += '<option value="deg">deg</option>';
                innerHTML += '<option value="rad">PI rad</option>';
                innerHTML += '</select>'

                parentDiv.innerHTML += innerHTML;

                if (rule) {
                    var selector = document.getElementById("degrad_selector");
                    for (i = 0; i < selector.options.length; i++) {
                        if (selector.options[i].value == rule.degrad)
                            selector.selectedIndex = i;
                    }
                }

                appendModeSelector(parentDiv);
                if (rule) if (rule.mode) setModeSelector(rule.mode);
                else setModeSelector("Local");

                $('#amount_input_field').change(inputChanged);
                $('#axis_selector').change(inputChanged);
                $('#degrad_selector').change(inputChanged);
            };
            rotation.createRuleDescriptor = function () {
                var selector = document.getElementById("axis_selector");
                var selection = selector.options[selector.selectedIndex].value;
                var rule = {
                    type: "Rotation",
                    axis: selection,
                    amount: document.getElementById("amount_input_field").value,
                    mode: getMode()
                }
                selector = document.getElementById("degrad_selector");
                selection = selector.options[selector.selectedIndex].value;
                rule["degrad"] = selection;
                return rule;
            };
            rotation.createHandles = function (scene, shape) {
                this.draggingHelpers.scene = scene;

                // switch circle color
                var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                var toSwitch = null;
                if (this.draggingHelpers.activeHandle) toSwitch = this.draggingHelpers.activeHandle;
                else if (this.draggingHelpers.overHandle) toSwitch = this.draggingHelpers.overHandle;
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
                var selector = document.getElementById("axis_selector");
                var selection = selector.options[selector.selectedIndex].value;
                var material = null;
                switch (selection) {
                    case 'Axis.X':
                        material = new THREE.LineBasicMaterial({ color: colors[0] });
                        var rotation = new THREE.Matrix4().makeRotationY(Math.PI / 2);
                        break;
                    case 'Axis.Y':
                        material = new THREE.LineBasicMaterial({ color: colors[1] });
                        var rotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
                        break;
                    case 'Axis.Z':
                        material = new THREE.LineBasicMaterial({ color: colors[2] });
                        var rotation = new THREE.Matrix4().makeRotationZ(0);
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
                geometry.applyMatrix(rotation);
                geometry.applyMatrix(m);

                // Generate circle
                var circle = new THREE.Line(geometry, material);
                scene.add(circle);
                this.draggingHelpers.id = circle.id;
            };
            rotation.onMouseOverHandle = function (id) {
                if (this.draggingHelpers.overHandle) var oldHandle = this.draggingHelpers.overHandle;
                var selector = document.getElementById("axis_selector");
                var selection = selector.options[selector.selectedIndex].value;
                switch (selection) {
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
                if (oldHandle != this.draggingHelpers.overHandle) inputChanged();
            };
            rotation.onMouseNotOverHandle = function () {
                oldHandle = this.draggingHelpers.overHandle;
                this.draggingHelpers.overHandle = null;
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            rotation.onHandlePressed = function (id, mouse, intersection, scene, camera) {
                this.draggingHelpers.cam = camera;
                this.draggingHelpers.activeHandle = id;
                this.draggingHelpers.intersection = intersection;
                this.draggingHelpers.scene = scene;
                this.draggingHelpers.startValue = parseFloat(document.getElementById("amount_input_field").value);

                var segment = this.draggingHelpers.scene.getObjectById(id);
                this.draggingHelpers.vertices = segment.geometry.vertices
            };
            rotation.onHandleDragged = function (mouse) {
                var vertices = this.draggingHelpers.vertices;

                // project mouse into scene
                var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                mousePoint.unproject(this.draggingHelpers.cam);
                var mouseRay = new THREE.Ray(this.draggingHelpers.cam.position, mousePoint.sub(this.draggingHelpers.cam.position).normalize());

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
                var startDir = this.draggingHelpers.intersection.clone().sub(mid).normalize();
                var endDir = nearestPoint.clone().sub(mid).normalize();
                var normal = startDir.clone().cross(endDir);
                var viewingAngle = normal.angleTo(this.draggingHelpers.cam.position.clone().sub(mid));
                var standard1 = vertices[0];
                var standard2 = vertices[1];
                var standard1Dir = standard1.clone().sub(mid).normalize();
                var standard2Dir = standard2.clone().sub(mid).normalize();
                var standardNormal = standard1Dir.clone().cross(standard2Dir);
                var standardAngle = standardNormal.angleTo(this.draggingHelpers.cam.position.clone().sub(mid));
                var direction = 1;
                var selector = document.getElementById("axis_selector");
                var selection = selector.options[selector.selectedIndex].value;
                if (viewingAngle < (0.5 * Math.PI)) direction *= -1;
                if (standardAngle > (0.5 * Math.PI)) direction *= -1;
                if (selection == "Axis.Y") direction *= -1

                // calc rotation angle            
                var angle = startDir.angleTo(endDir);

                // update input fields
                selector = document.getElementById("degrad_selector");
                selection = selector.options[selector.selectedIndex].value;
                if (selection == "rad") {
                    document.getElementById("amount_input_field").value = '' + (this.draggingHelpers.startValue + direction * (angle / Math.PI)).round();
                } else {
                    document.getElementById("amount_input_field").value = '' + (this.draggingHelpers.startValue + direction * ((angle * 180) / Math.PI)).round();
                }

                inputChanged();
            };
            rotation.onHandleReleased = function () {
                oldHandle = this.draggingHelpers.activeHandle;
                this.draggingHelpers.activeHandle = null;
                if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
            };
        }


        // #################################################################################################################################
        // ################################################## SPLIT ########################################################################
        // #################################################################################################################################

        {
            var split = jQuery.extend(true, {}, abstractRule)
            // helpers
            {
                split.draggingHelpers = {
                    nextIndex: 0,
                    epsilon: 0.001
                }

                split.generatesMultipleShapes = true;

                split.addPart = function (settings) {
                    button = document.getElementById("addPartButton");
                    partDiv = document.createElement('div');
                    partDiv.style = 'margin:0.01em 16px';
                    partDiv.id = 'partDiv' + self.rules.get("Split").draggingHelpers.nextIndex;
                    var partname = 'part' + self.rules.get("Split").draggingHelpers.nextIndex + '_mode_selector';
                    innerHTML = '<select id=' + partname + '>';
                    innerHTML += '<option value="Relative">Relative</option>';
                    innerHTML += '<option value="Absolute">Absolute</option>';
                    innerHTML += '</select>';
                    partDiv.innerHTML += innerHTML;
                    amount_input = document.createElement("input");
                    amount_input.setAttribute('type', 'text');
                    var inputname = 'part' + self.rules.get("Split").draggingHelpers.nextIndex + '_amount_input_field';
                    amount_input.setAttribute('id', inputname);
                    partDiv.appendChild(amount_input);

                    var addPostfixName = 'part' + self.rules.get("Split").draggingHelpers.nextIndex + '_add_postfix_button';
                    addPostfixButton = document.createElement('button');
                    addPostfixButton.id = addPostfixName;
                    addPostfixButton.style = 'margin:0px 20px';
                    addPostfixButtonText = document.createTextNode('add Postfix');
                    addPostfixButton.appendChild(addPostfixButtonText);
                    partDiv.appendChild(addPostfixButton);

                    var removename = 'part' + self.rules.get("Split").draggingHelpers.nextIndex + '_remove_button';
                    removeButton = document.createElement('button');
                    removeButton.id = removename;
                    removeButton.style = 'position:absolute;right:5px';
                    removeButtonText = document.createTextNode('X');
                    removeButton.appendChild(removeButtonText);
                    partDiv.appendChild(removeButton);

                    button.parentNode.insertBefore(partDiv, button);
                    $('#' + partname).change(inputChanged);
                    $('#' + inputname).change(inputChanged);
                    $('#' + addPostfixName).click(self.rules.get("Split").addPostfixFunction(partDiv.id, settings))
                    $('#' + removename).click(function (id) {
                        return function () {
                            part = document.getElementById(id);
                            button.parentNode.removeChild(part);
                            inputChanged();
                        }
                    }(partDiv.id));

                    if (settings) {
                        selector = document.getElementById(partname);
                        for (var i = 0; i < 2; i++) {
                            if (selector.options[i].label == settings.mode) selector.selectedIndex = i;
                        }
                        amount_input.value = settings.amount;
                        for (var i = 0; i < Object.keys(settings.tags).length; i++) {
                            self.rules.get("Split").addPostfix(partDiv.id, settings.tags[i]);
                        }
                    } else {
                        amount_input.value = 1;
                    }

                    self.rules.get("Split").draggingHelpers.nextIndex++;
                    inputChanged();
                };

                split.addPostfixFunction = function (partId, settings) {
                    return function () {
                        split.addPostfix(partId, settings);
                    }
                }
                split.addPostfix = function (partId, settings) {
                    part = document.getElementById(partId);
                    var possiblePostfixes = ["Goal", "goal", "Tag", "Attribute", "Asset", "Paint", "Orientation", "Reflect", "Void", "Family", "Sync"];
                    renderer.postfixController.addPostfix(part, settings, possiblePostfixes, deleteButton = true);
                }
            }
            // standard functions
            split.generateRuleString = function (rule) {
                var ruleString = "new Rules.Split(" + rule.axis + ",";
                var counter = 1;
                for (var part in rule.parts) {
                    ruleString += "\n\t\t" + rule.parts[part].mode + "(" + rule.parts[part].amount + ")";
                    if (counter < Object.keys(rule.parts).length) ruleString += ',';
                    ruleString = addTags(rule.parts[part], ruleString, 3);
                    counter++;
                }
                ruleString += "\n\t\t)";
                ruleString = addTags(rule, ruleString);
                ruleString += ";";
                return ruleString;
            };
            split.generateShortString = function (rule) {
                var keys = Object.keys(rule.parts);
                var size = keys.length;
                return ("Split into " + size + " parts.");
            };
            split.appendInputFields = function (parentDiv, rule) {
                var innerHTML = '<select id="axis_selector">';
                innerHTML += '<option value="Axis.X">Axis.X</option>';
                innerHTML += '<option value="Axis.Y">Axis.Y</option>';
                innerHTML += '<option value="Axis.Z">Axis.Z</option>';
                innerHTML += '</select>'
                parentDiv.innerHTML += innerHTML;

                addPartButton = document.createElement('button');
                addPartButton.id = "addPartButton";
                addPartButton.style.marginLeft = "1em";
                var addPartButton_text = document.createTextNode("add Part");
                addPartButton.appendChild(addPartButton_text);
                parentDiv.appendChild(addPartButton);

                $("#addPartButton").click(function () {
                    self.rules.get("Split").addPart(null);
                });
                $('#axis_selector').change(inputChanged);

                if (rule) {
                    selector = document.getElementById("axis_selector");
                    for (var i = 0; i < 3; i++) {
                        if (selector.options[i].label == rule.axis) selector.selectedIndex = i;
                    }
                    for (var i = 0; i < Object.keys(rule.parts).length; i++) {
                        self.rules.get("Split").addPart(rule.parts[Object.keys(rule.parts)[i]]);
                    }
                } else {
                    self.rules.get("Split").addPart();
                    self.rules.get("Split").addPart();
                }
            };
            split.createRuleDescriptor = function () {
                var selector = document.getElementById("axis_selector");
                var selection = selector.options[selector.selectedIndex].value;
                var rule = {
                    type: "Split",
                    axis: selection,
                    parts: {}
                }
                var sumAbs = 0;
                for (var i = 0; i < this.draggingHelpers.nextIndex; i++) {
                    var name = 'part' + i + '_mode_selector';
                    modeSelector = document.getElementById(name);
                    if (modeSelector) {
                        amountInput = document.getElementById('part' + i + '_amount_input_field');
                        mode = modeSelector.options[modeSelector.selectedIndex].value;
                        amount = amountInput.value;
                        if (mode == 'Absolute') sumAbs += parseFloat(amount);
                        rule.parts['part' + i] = { mode: mode, amount: amount };

                        var partId = 'partDiv' + i;
                        var part = document.getElementById(partId)
                        readTags(part, rule.parts['part' + i]);
                    }
                }

                if (!this.draggingHelpers.fullSize) this.draggingHelpers.fullSize = 99999999;
                if (this.draggingHelpers.fullSize < sumAbs - this.draggingHelpers.epsilon) {
                    this.draggingHelpers.dontDraw = true;
                    alert("Sum of absolute parts is larger than available size.\nThis would result in an error!");
                } else this.draggingHelpers.dontDraw = false;

                return rule;
            };
            split.applyRule = function (rule, shape) {
                var parts = rule.parts;
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
                switch (this.draggingHelpers.axis) {
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

                this.draggingHelpers.fullSize = size;
                this.draggingHelpers.width = width;
                this.draggingHelpers.height = height;

                var avRel = size - sumAbs;
                var segRelSize = 0;
                this.draggingHelpers.partKind = [];
                this.draggingHelpers.segments = [];
                this.draggingHelpers.input = [];
                for (var i = 0; i < Object.keys(parts).length; i++) {
                    var partname = Object.keys(parts)[i];
                    if (parts[partname].mode == "Relative") {
                        var amount = isNaN(parseFloat(parts[partname].amount)) ? 0 : parseFloat(parts[partname].amount);
                        amount = Math.max(this.draggingHelpers.epsilon, amount);
                        this.draggingHelpers.partKind.push('rel');
                        var segmentSize = amount / sumRel * avRel
                        this.draggingHelpers.segments.push(segmentSize);
                        this.draggingHelpers.input.push(amount);
                        segRelSize = segRelSize + segmentSize;
                    } else {
                        var amount = isNaN(parseFloat(parts[partname].amount)) ? 0 : parseFloat(parts[partname].amount);
                        amount = Math.max(this.draggingHelpers.epsilon, amount);
                        this.draggingHelpers.partKind.push('abs');
                        this.draggingHelpers.segments.push(amount);
                        this.draggingHelpers.input.push(amount);
                    }
                }
                this.draggingHelpers.unitsPerInput = 1;
                if (sumRel != 0) this.draggingHelpers.unitsPerInput = segRelSize / sumRel;
                this.draggingHelpers.sumRel = segRelSize;

                this.draggingHelpers.axis = rule.axis;
            };
            split.unapplyRule = function (rule, shape) {
                this.draggingHelpers.segments = [1];
            };
            split.addPreview = function (shape) {
                if (this.draggingHelpers.dontDraw) return;

                var offset = -this.draggingHelpers.fullSize / 2;
                var scale;
                var translate;
                var mat;
                for (var i = 0; i < this.draggingHelpers.segments.length; i++) {
                    var m = shape.appearance.transformation;
                    m = new THREE.Matrix4().fromArray(m);
                    var size = Math.max(0.000001, this.draggingHelpers.segments[i]);
                    switch (this.draggingHelpers.axis) {
                        case 'Axis.X':
                            scale = new THREE.Matrix4().makeScale(size / this.draggingHelpers.fullSize, 1, 1);
                            translate = new THREE.Matrix4().makeTranslation(offset + size / 2, 0, 0);
                            break;
                        case 'Axis.Y':
                            scale = new THREE.Matrix4().makeScale(1, size / this.draggingHelpers.fullSize, 1);
                            translate = new THREE.Matrix4().makeTranslation(0, offset - size / 2, 0);
                            break;
                        case 'Axis.Z':
                            scale = new THREE.Matrix4().makeScale(1, 1, size / this.draggingHelpers.fullSize);
                            translate = new THREE.Matrix4().makeTranslation(0, 0, offset - size / 2);
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
                if (this.draggingHelpers.dontDraw) return;

                this.draggingHelpers.scene = scene;

                var basicColors = [0xAA3030, 0x30AA30, 0x3030AA];
                var highlightColors = [0xFF0000, 0x00FF00, 0x0000FF];

                mat = shape.shape.appearance.transformation;
                var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                center = new THREE.Vector3(0, 0, 0);
                center.applyProjection(m);

                var dir;
                switch (this.draggingHelpers.axis) {
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

                var widthOffset = this.draggingHelpers.width / (this.draggingHelpers.segments.length - 1);
                var heightOffset = this.draggingHelpers.height / (this.draggingHelpers.segments.length - 1);

                switch (this.draggingHelpers.axis) {
                    case 'Axis.X':
                        center.add(new THREE.Vector3(-this.draggingHelpers.fullSize / 2, -this.draggingHelpers.width / 2 - widthOffset / 2, -this.draggingHelpers.height / 2 - heightOffset / 2));
                        break;
                    case 'Axis.Y':
                        center.add(new THREE.Vector3(-this.draggingHelpers.width / 2 - widthOffset / 2, -this.draggingHelpers.fullSize / 2, -this.draggingHelpers.height / 2 - heightOffset / 2));
                        break;
                    case 'Axis.Z':
                        center.add(new THREE.Vector3(-this.draggingHelpers.width / 2 - widthOffset / 2, -this.draggingHelpers.height / 2 - heightOffset / 2, -this.draggingHelpers.fullSize / 2));
                        break;
                    default:
                        break;
                }

                this.draggingHelpers.highlight = null;
                var search = 0;
                if (!this.draggingHelpers.arrowIds) this.draggingHelpers.arrowIds = [];
                if (this.draggingHelpers.overHandle) search = this.draggingHelpers.overHandle;
                else if (this.draggingHelpers.activeHandle) search = this.draggingHelpers.activeHandle;
                for (var i = 0; i < this.draggingHelpers.arrowIds.length; i++) {
                    if (this.draggingHelpers.arrowIds[i] <= search && this.draggingHelpers.arrowIds[i] + 2 >= search) {
                        this.draggingHelpers.highlight = Math.floor(i / 2);
                    }
                };

                var oldStartingId = this.draggingHelpers.arrowIds[0] || 0;
                this.draggingHelpers.arrowIds = [];
                var counter = 0;
                for (var i = 0; i < this.draggingHelpers.segments.length - 1; i++) {
                    var size = Math.max(0.000001, this.draggingHelpers.segments[i]);
                    switch (this.draggingHelpers.axis) {
                        case 'Axis.X':
                            center.add(new THREE.Vector3(size, widthOffset, heightOffset));
                            if (counter == this.draggingHelpers.highlight) color = highlightColors[0];
                            else color = basicColors[0];
                            break;
                        case 'Axis.Y':
                            center.add(new THREE.Vector3(widthOffset, size, heightOffset));
                            if (counter == this.draggingHelpers.highlight) color = highlightColors[1];
                            else color = basicColors[1];
                            break;
                        case 'Axis.Z':
                            center.add(new THREE.Vector3(widthOffset, heightOffset, size));
                            if (counter == this.draggingHelpers.highlight) color = highlightColors[2];
                            else color = basicColors[2];
                            break;
                        default:
                            break;
                    }
                    counter++;

                    var arrowlength = Math.max(this.draggingHelpers.fullSize / 5, 0.1);
                    var backarrow = new THREE.ArrowHelper(new THREE.Vector3().sub(dir).normalize(), center, arrowlength, color, 0.2, 0.1);
                    var arrow = new THREE.ArrowHelper(dir.normalize(), center, arrowlength, color, 0.2, 0.1);
                    scene.add(arrow);
                    scene.add(backarrow);

                    this.draggingHelpers.arrowIds.push(arrow.id);
                    this.draggingHelpers.arrowIds.push(backarrow.id);
                }
                this.draggingHelpers.idOffset = this.draggingHelpers.arrowIds[0] - oldStartingId;
            };
            split.onMouseOverHandle = function (id) {
                oldHandle = this.draggingHelpers.overHandle;
                this.draggingHelpers.overHandle = id;
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            split.onMouseNotOverHandle = function () {
                oldHandle = this.draggingHelpers.overHandle;
                this.draggingHelpers.overHandle = null;
                if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
            };
            split.onHandlePressed = function (id, mouse, intersection, scene, camera) {

                id += this.draggingHelpers.idOffset;

                var clickedObject = scene.getObjectById(id);
                var arrowPos = clickedObject.parent.position;
                var initStart = arrowPos.clone();
                var initEnd = intersection.clone();
                var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
                var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
                this.draggingHelpers.segment = {
                    start: start,
                    end: end
                }

                this.draggingHelpers.directionFactor = 1;
                for (var i = 0; i < this.draggingHelpers.arrowIds.length; i++) {
                    if (this.draggingHelpers.arrowIds[i] <= id && this.draggingHelpers.arrowIds[i] + 2 >= id) {
                        this.draggingHelpers.beforeActiveCut = Math.floor(i / 2);
                        if (i.isOdd()) this.draggingHelpers.directionFactor = -1;
                    }
                };

                this.draggingHelpers.startingSegments = this.draggingHelpers.segments.slice();
                this.draggingHelpers.startingInput = this.draggingHelpers.input.slice();

                this.draggingHelpers.cam = camera;
                this.draggingHelpers.intersection = intersection;
                this.draggingHelpers.arrowPos = arrowPos;

                this.draggingHelpers.activeHandle = id;
            };
            split.onHandleDragged = function (mouse) {
                var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
                mousePoint.unproject(this.draggingHelpers.cam);
                var mouseRay = new THREE.Ray(this.draggingHelpers.cam.position, mousePoint.sub(this.draggingHelpers.cam.position).normalize());

                var targetPoint = new THREE.Vector3();
                mouseRay.distanceSqToSegment(this.draggingHelpers.segment.start,
                    this.draggingHelpers.segment.end,
                    null,
                    targetPoint);

                var diff = targetPoint.sub(this.draggingHelpers.intersection);
                var length = diff.length();
                var direction = this.draggingHelpers.intersection.clone().sub(this.draggingHelpers.arrowPos);
                var angle = diff.normalize().angleTo(direction.normalize());
                if (angle > (0.5 * Math.PI)) length *= -1;
                length *= this.draggingHelpers.directionFactor;

                if (length > 0) {
                    toReduce = this.draggingHelpers.beforeActiveCut + 1;
                    toEnlarge = this.draggingHelpers.beforeActiveCut;
                } else {
                    toReduce = this.draggingHelpers.beforeActiveCut;
                    toEnlarge = this.draggingHelpers.beforeActiveCut + 1;
                }

                var inputs = this.draggingHelpers.startingInput.slice();
                var segments = this.draggingHelpers.startingSegments.slice();
                var types = this.draggingHelpers.partKind.slice();

                var maxMovement = segments[toReduce];
                length = Math.min(maxMovement, Math.abs(length));

                var nrRel = 0;
                for (var i = 0; i < segments.length; i++) {
                    if (types[i] == 'rel') nrRel++;
                }
                if (nrRel == 1) {
                    if (types[toReduce] == 'rel') {
                        segments[toEnlarge] += length;
                        segments[toReduce] = inputs[toReduce] * this.draggingHelpers.unitsPerInput;
                    } else if (types[toEnlarge] == 'rel') {
                        segments[toReduce] -= length;
                        segments[toEnlarge] = inputs[toEnlarge] * this.draggingHelpers.unitsPerInput;
                    } else {
                        segments[toReduce] -= length;
                        segments[toEnlarge] += length;
                    }
                } else {
                    segments[toReduce] -= length;
                    segments[toEnlarge] += length;
                }

                var counter = 0;
                for (var i = 0; i < this.draggingHelpers.nextIndex; i++) {
                    amountInput = document.getElementById('part' + i + '_amount_input_field');
                    if (amountInput) {
                        if (counter == toReduce || counter == toEnlarge) {
                            if (types[counter] == 'abs') {
                                amountInput.value = Math.max(this.draggingHelpers.epsilon, segments[counter]).round();
                            } else {
                                if (isNaN(segments[counter] / this.draggingHelpers.unitsPerInput)) {
                                    var amount = inputs[counter];
                                } else if (isFinite(segments[counter] / this.draggingHelpers.unitsPerInput)) {
                                    var amount = segments[counter] / this.draggingHelpers.unitsPerInput;
                                } else {
                                    var amount = inputs[counter];
                                }
                                amountInput.value = Math.max(this.draggingHelpers.epsilon, amount).round();
                            }
                        }
                        counter++;
                    }
                }

                inputChanged();
            };
            split.onHandleReleased = function () {
                oldHandle = this.draggingHelpers.activeHandle;
                this.draggingHelpers.activeHandle = null;
                if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
            };
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

            var paint = generateCustomRule(self.paintConfig);
            paint.generateRuleString = function (rule) {
                var ruleString = "new Rules.Paint(" + rule.selections[0];
                if (rule.selections[1] != null) ruleString += '(' + rule.selections[1] + ')';
                ruleString += ')';
                ruleString = addTags(rule, ruleString);
                ruleString += ";";
                return ruleString;
            };
            paint.generateShortString = function (rule) {
                var ruleString = "Paint with " + rule.selections[0];
                if (rule.selections[1] != null) ruleString += '(' + rule.selections[1] + ')';
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
        }

        // #################################################################################################################################
        // ################################################## HUE ##########################################################################
        // #################################################################################################################################

        {

            var colors = ["Color.Ambient", "Color.Diffuse", "Color.Emmisive", "Color.AmbientAndDiffuse", "Color.Specular"];
            var hueConfig = {
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

        }

        // #################################################################################################################################
        // ################################################## SATURATION ###################################################################
        // #################################################################################################################################

        {
            var saturationConfig = {
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
        }

        // #################################################################################################################################
        // ################################################## Goal #########################################################################
        // #################################################################################################################################

        {
            var GoalConfig = {
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
        }

        // #################################################################################################################################
        // ################################################## goal #########################################################################
        // #################################################################################################################################

        {
            var goalConfig = {
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
        }

        // #################################################################################################################################
        // ################################################## Attribute ####################################################################
        // #################################################################################################################################

        {
            var attributeConfig = {
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
        }

        // #################################################################################################################################
        // ##################################################### Concat ####################################################################
        // #################################################################################################################################

        {
            var concat = jQuery.extend(true, {}, abstractRule)

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
                for (var i = rule.selections.length-1; i >= 0; i--) {
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
        }
    }


    self.rules.set(translateConfig.type, translation);
    self.rules.set(scaleConfig.type, scale);
    self.rules.set(growConfig.type, grow);
    self.rules.set(sizeConfig.type, sizeRule);
    self.rules.set("Rotation", rotation);
    self.rules.set(self.orientationConfig.type, generateCustomRule(self.orientationConfig));
    self.rules.set(self.reflectionConfig.type, generateCustomRule(self.reflectionConfig));
    self.rules.set("Split", split);
    self.rules.set(self.paintConfig.type, paint);
    self.rules.set(hueConfig.type, generateCustomRule(hueConfig));
    self.rules.set(saturationConfig.type, generateCustomRule(saturationConfig));
    self.rules.set(attributeConfig.type, generateCustomRule(attributeConfig));
    self.rules.set(self.assetConfig.type, generateCustomRule(self.assetConfig));
    self.rules.set(GoalConfig.type, generateCustomRule(GoalConfig));
    self.rules.set(goalConfig.type, generateCustomRule(goalConfig));
    self.rules.set("Concat", concat);

return self;
}





/*
TODO:

Scale: modes
Grow: modes
Size: all
Copy: all
Repeat: all
Concat: all
*/