
var instance;
var renderer;

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

function lookupColor(color) {
    if (!color) color = "blue";
    switch (color) {
        case "green":
            color = 0x44ff3b;
            break;
        case "blue":
            color = 0x0099ff;
            break;
        default:
            break;
    }
    return color;
}

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function getRuleController(newRenderer) {
    if (newRenderer) renderer = newRenderer;
    if (instance) return instance;
    instance = new TempRuleController();
    return instance;
}

function TempRuleController() {

    var self = {};

    self.rules = new Map();

    self.meshes = new Map();

    self.tmpRules = [];
    self.parsedRules = [];

    self.previewScene = new THREE.Scene();

    self.addRuleFactory = function(type, factory) {
        self.rules.set(type, factory);
    };

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
        self.tmpRules.push(rule);

        rule.applyRule(shape);
        rule.afterApply(shape);
        if (self.meshes[shape.id])
            rule.removePreview(shape);
        rule.addPreview(shape);

        var editor = ace.edit("code_text_ace");
        var selection = editor.getSelection();
        selection.clearSelection();
        editor.setValue(editor.getValue() + "\n\n", 1);
        selection.moveCursorFileEnd();
        rule.start = editor.session.doc.positionToIndex(editor.getCursorPosition());
        editor.setValue(editor.getValue() + rule.generateRuleString(rule), 1);
        selection.moveCursorFileEnd();
        rule.end = editor.session.doc.positionToIndex(editor.getCursorPosition());
        editor.clearSelection();
        selection.moveCursorToPosition(rule.start);
        selection.selectToPosition(rule.end);
    };

    self.removeRule = function (rule, shape) {
        // unapply for other shapes
        for (var otherShape in rule.willAppliedToList) {
            rule.unapplyRule(rule.willAppliedToList[otherShape]);
            rule.afterUnapply(rule.willAppliedToList[otherShape]);
            self.removePreview(rule.willAppliedToList[otherShape]);
        }

        // remove from code
        var editor = ace.edit("code_text_ace");
        var fullString = editor.getValue();
        fullString = fullString.substr(0, rule.start) + fullString.substr(rule.end);
        editor.setValue(fullString);
        var diff = rule.end - rule.start;

        for (var index in self.parsedRules) {
            if (self.parsedRules[index].start > rule.start) {
                self.parsedRules[index].start -= diff;
                self.parsedRules[index].end -= diff;
            }
        }
        for (index in self.tmpRules) {
            if (self.tmpRules[index].start > rule.start) {
                self.tmpRules[index].start -= diff;
                self.tmpRules[index].end -= diff;
            }
        }
        var selection = editor.getSelection();
        selection.clearSelection();

        // remove preview if necessary
        if (shape) shape = shape.shape;
        else if (rule.wasAppliedTo) shape = rule.wasAppliedTo;

        if (shape && shape.appliedRules == 0) rule.removePreview(shape);

        rule.deleted = true;
    };

    self.updateRule = function (shape, rule) {
        if (!rule) return;
        if (!shape) return;

        // update rule
        renderer.RenderSingleFrame();
        rule.removePreview(shape);
        renderer.RenderSingleFrame();
        rule.unapplyRule(shape);
        renderer.RenderSingleFrame();
        rule.afterUnapply(shape);
        renderer.RenderSingleFrame();
        rule.updateRule();
        renderer.RenderSingleFrame();
        rule.applyRule(shape);
        renderer.RenderSingleFrame();
        rule.afterApply(shape);
        renderer.RenderSingleFrame();
        rule.addPreview(shape, "green");
        renderer.RenderSingleFrame();

        var editor = ace.edit("code_text_ace");
        var newString = rule.generateRuleString();
        var fullString = editor.getValue();
        fullString = fullString.substr(0, rule.start) + newString + fullString.substr(rule.end);
        editor.setValue(fullString);
        var diff = newString.length - (rule.end - rule.start);
        rule.end += diff;

        for (var index in self.parsedRules) {
            if (self.parsedRules[index].start > rule.start) {
                self.parsedRules[index].start += diff;
                self.parsedRules[index].end += diff;
            }
        }
        for (index in self.tmpRules) {
            if (self.tmpRules[index].start > rule.start) {
                self.tmpRules[index].start += diff;
                self.tmpRules[index].end += diff;
            }
        }

        rule.edited = true;

        var selection = editor.getSelection();
        var start = charToRowCol(rule.start);
        var end = charToRowCol(rule.end);
        selection.clearSelection();
        selection.moveCursorToPosition(start);
        selection.selectToPosition(end);
    };

    self.createRule = function (type) {
        var factory = self.rules.get(type);
        return factory();
    };

    self.parseRule = function (ruleBuffer) {
        var ruleType = ruleBuffer[2].Text;
        var factory = self.rules.get(ruleType);
        var rule;
        if (!factory) {
            rule = { type: 'ruleNotFound' };
            var position = 0;
        } else {
            rule = factory();
            position = rule.parseCode(ruleBuffer);
        }
        return [rule, position];
    };

    self.setParsedRules = function(rules) {
        self.parsedRules = rules;
    };

    self.getParsedRules = function () {
        return self.parsedRules;
    };

    self.getRuleHistory = function (shape) {
        return self.getAlltmpRules[shape.id];
    };

    self.getAllTmpRules = function () {
        return self.tmpRules;
    };

    self.getRuleByIndex = function (indey) {
        return self.tmpRules[index];
    };

    self.addPreview = function (shape, color) {
        color = lookupColor(color);
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
            color: color,
            wireframe: true
        });
        var mesh = new THREE.Mesh(geo, wireFrameMaterial);
        mesh.matrixAutoUpdate = false;
        mesh.applyMatrix(matrix);
        mesh.mName = shape.id;
        mesh.mMaterial = wireFrameMaterial;
        mesh.visible = visible;
        self.previewScene.add(mesh);

        self.meshes[shape.id] = mesh;

    };

    self.removePreview = function (shape) {
        self.previewScene.remove(self.meshes[shape.id]);
        self.meshes.delete(shape.id);
    };

    self.changePreviewColor = function (shape, color, rule) {
        color = lookupColor(color);
        self.removePreview(shape);
        if (rule) rule.addPreview(shape, color);
        else self.addPreview(shape, color);
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
        var modeDiv = document.createElement('div');
        modeDiv.id = 'modeDiv';
        var innerHTML = '<div style="width:10%"><span>Mode: </span></div>';
        innerHTML += '<select id="mode_selector">';
        innerHTML += '<option value="Mode.Local">Local</option>';
        innerHTML += '<option value="Mode.LocalMid">LocalMid</option>';
        innerHTML += '<option value="Mode.Global">Global</option>';
        innerHTML += '<option value="Mode.GlobalMid">GlobalMid</option>';
        innerHTML += '</select>';
        modeDiv.innerHTML += innerHTML;
        modeDiv.style.paddingLeft = '10px';
        parentDiv.appendChild(modeDiv);
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
    parseMode = function(ruleBuffer, rule) {
        var i = 0;
        while (i < ruleBuffer.length && i < 10) {
            while (i < ruleBuffer.length && i < 10 && ruleBuffer[i].Text != 'Mode') {
                i += 1;
            }
            if (i < ruleBuffer.length && i < 10 && ruleBuffer[i + 1].Text == '.') {
                var mode = ruleBuffer[i + 2].Text;
                rule.mode = mode;
                return i + 2;
            } else return 0;
        }
        return 0;
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
                this.lastRuleString = ruleString;
                return ruleString;
            };
            abstractRule.getLastRuleString = function () {
                return this.lastRuleString;
            };
            abstractRule.generateShortString = function () {
                return "short not implemented yet";
            };
            abstractRule.applyRule = function (shape) {
            };
            abstractRule.afterApply = function (shape) {
                if (!shape.appliedRules) shape.appliedRules = 1;
                else shape.appliedRules += 1;
                this.wasAppliedTo = shape;
            };
            abstractRule.unapplyRule = function (shape) {
            };
            abstractRule.afterUnapply = function (shape) {
                shape.appliedRules -= 1;
            };
            abstractRule.appendInputFields = function (parentDiv) {
            };
            abstractRule.updateRule = function () {
            };
            abstractRule.additionalUpdates = function () {
            };
            abstractRule.draggingHelpers = {};
            abstractRule.createHandles = function (scene, shape) {
                this.draggingHelpers.scene = scene;
                var colors = [0xAA0000, 0x00AA00, 0x0000AA];
                this.draggingHelpers.arrowIds = buildStandardAxes(scene, shape, colors, true);
            };
            abstractRule.onMouseOverHandle = function (id) {
            };
            abstractRule.onMouseNotOverHandle = function () {
            };
            abstractRule.onHandlePressed = function (id, mouse, intersection, scene, camera, shape) {
            };
            abstractRule.onHandleDragged = function (mouse) {
            };
            abstractRule.onHandleReleased = function () {
            };
            abstractRule.addPreview = self.addPreview;
            abstractRule.removePreview = self.removePreview;
            abstractRule.parseCode = function (ruleBuffer) {
                return 0;
            };
            abstractRule.generatesMultipleShapes = false;
            abstractRule.storeCurrentState = function () {
            };
            abstractRule.setStoredState = function () {
            };
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
                customRule.selections = self.initSelections(config.options);
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
                        ruleString += customRule.selections[i].toString();
                        ruleString += ", ";
                    }
                    ruleString = ruleString.slice(0, -2);
                    return ruleString;
                };
                customRule.updateRule = function () {
                    var inputFieldController = getInputFieldController();
                    for (var i = 0; i < config.options.length; i++) {
                        customRule.selections[i] = inputFieldController.getValue(customRule.fieldIds[i]);
                    }

                    if (config.mode) {
                        customRule.mode = getMode();
                    }

                    customRule.additionalUpdates();
                };
                customRule.additionalUpdates = function () {
                };
                customRule.afterInputCreation = function (parentDiv) {
                };
                customRule.onselectionChange = inputChanged;
                customRule.appendInputFields = function (parentDiv, empty /* dont fill input with current values */) {
                    customRule.fieldIds = [];
                    var defaults = [];
                    var inputFieldController = getInputFieldController();
                    if (!empty && customRule.selections[0]) {
                        for (var i = 0; i < config.options.length; i++) {
                            var current = config.options[i];
                            defaults = customRule.selections[i];

                            customRule.fieldIds[i] = inputFieldController.addInputField(parentDiv, current.label, [current.inputType], defaults, customRule.onselectionChange);
                        }
                    } else {
                        defaults = self.prepareDefaults(config.options);
                        for (var i = 0; i < config.options.length; i++) {
                            var current = config.options[i];
                            customRule.fieldIds[i] = inputFieldController.addInputField(parentDiv, current.label, [current.inputType], defaults[i], customRule.onselectionChange);
                        }
                    }

                    if (config.mode) {
                        appendModeSelector(parentDiv);
                        if (!empty) if (customRule.mode) setModeSelector(customRule.mode);
                        else setModeSelector("Local");
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
                                    customRule.selections.push(InputFieldValue(current.Text.substring(1, (current.Text.length - 1))));
                                    optionIndex += 1;
                                }
                                counter += 1;
                                break;

                            case INPUTTYPE.RAW:
                                if (current.RawKind == 8508 && current.Text.startsWith('Rnd')) {
                                    var value;
                                    [value, steps] = self.parseRnd(ruleBuffer.slice(counter));
                                    customRule.selections.push(value);
                                    counter += steps;
                                    continue;
                                }
                                if (current.Text == '-' && current.RawKind == 8202) {
                                    minus = true;
                                } else if (current.RawKind == 8509) {
                                    if (minus) customRule.selections.push(InputFieldValue(-1 * parseFloat(current.Text)));
                                    else customRule.selections.push(InputFieldValue(parseFloat(current.Text)));
                                    minus = false;
                                    optionIndex += 1;
                                } else if (current.RawKind == 8511 ||
                                    current.RawKind == 8323) {
                                    if (minus) customRule.selections.push(InputFieldValue('-' + current.Text));
                                    else customRule.selections.push(InputFieldValue(current.Text));
                                    minus = false;
                                    optionIndex += 1;
                                }
                                counter += 1;
                                break;

                            case INPUTTYPE.DROPDOWN:
                                if (current.RawKind == 8508 && current.Text != "Rules" && ruleBuffer[counter - 1].Text != '.') {
                                    if (ruleBuffer[counter + 1].Text == '.' && ruleBuffer[counter + 2].RawKind == 8508) {
                                        customRule.selections.push(InputFieldValue(current.Text + '.' + ruleBuffer[counter + 2].Text));
                                        counter += 3;
                                    } else {
                                        customRule.selections.push(InputFieldValue(current.Text));
                                        counter += 1;
                                    }
                                    optionIndex += 1;
                                } else {
                                    counter += 1;
                                }
                                break;

                            case INPUTTYPE.DOUBLE:
                                if (current.RawKind == 8508 && current.Text.startsWith('Rnd')) {
                                    var value;
                                    [value, steps] = self.parseRnd(ruleBuffer.slice(counter));
                                    customRule.selections.push(value);
                                    counter += steps;
                                    continue;
                                }
                                if (current.Text == '-' && current.RawKind == 8202) {
                                    minus = true;
                                } else if (current.RawKind == 8509) {
                                    if (minus) customRule.selections.push(new InputFieldValue(-1 * parseFloat(current.Text)));
                                    else customRule.selections.push(InputFieldValue(parseFloat(current.Text)));
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
                                } else if (current.RawKind == 8508 && current.Text.startsWith('Rnd')) {
                                    var value;
                                    [value, steps] = self.parseRnd(ruleBuffer.slice(counter));
                                    vec3.push(value);
                                    counter += steps;
                                    continue;
                                } else if (current.RawKind == 8509) {
                                    if (minus) vec3.push(InputFieldValue(-1 * parseFloat(current.Text)));
                                    else vec3.push(InputFieldValue(parseFloat(current.Text)));
                                    minus = false;
                                } else if (current.Text == ")" && current.RawKind == 8201 && vec3.length == 3) {
                                    this.selections.push(InputFieldValue(vec3));
                                    optionIndex += 1;
                                }
                                counter += 1;
                                break;

                            default:
                                counter += 1;
                                break;

                        }
                    }

                    counter += parseMode(ruleBuffer.slice(counter), customRule);

                    return counter;
                };
                customRule.storeCurrentState = function () {
                    customRule.storedState = jQuery.extend(true, {}, customRule.selections);
                    if (config.mode) customRule.storedMode = customRule.mode;
                    customRule.storedPostfixes = jQuery.extend(true, {}, customRule.postfixes);
                };
                customRule.setStoredState = function () {
                    var inputFieldController = getInputFieldController();
                    for (var i = 0; i < config.options.length; i++) {
                        inputFieldController.setValue(customRule.fieldIds[i], customRule.storedState[i], true /*update range*/);
                    }

                    if (config.mode && customRule.storedMode) {
                        setModeSelector(customRule.storedMode)
                    }

                    customRule.postfixes = JSON.parse(JSON.stringify(customRule.storedPostfixes));
                };
                return customRule;
            }
        }

        self.parseRnd = function(ruleBuffer) {
            var value = InputFieldValue();
            var steps = 1;

            switch(ruleBuffer[0].Text) {
                case 'Rnd':
                    value.setRandomType(RANDOMTYPE.RND);
                    break;
                case 'RndFunc':
                    value.setRandomType(RANDOMTYPE.RNDFUNC);
                    break;
                default:
                    break;
            }

            var current;
            var min = null, max = null;
            while (steps < ruleBuffer.length) {
                current = ruleBuffer[steps];
                switch (current.RawKind) {
                    case 8200:  // '('
                        break;
                    case 8509:  // number
                        if (min == null) min = parseFloat(current.Text);
                        else if (max == null) max = parseFloat(current.Text);
                        break;
                    case 8216:  // ','
                        break;
                    case 8201:  // ')'
                        if (min != null && max != null) value.setValue([min, max]);
                        return [value, steps+1];
                        break;
                    default:
                        break;
                }
                steps += 1;
            }

            return [value, 1];

        };

        self.initSelections = function (options) {
            var selections = Array(options.length);
            for (var i = 0; i < options.length; i++) {
                switch (options[i].inputType) {
                    case INPUTTYPE.DROPDOWN:
                        selections[i] = InputFieldValue(options[i].values[0]);
                        break;
                    case INPUTTYPE.VEC3:
                        selections[i] = InputFieldValue([
                            InputFieldValue(options[i].values[0]),
                            InputFieldValue(options[i].values[1]),
                            InputFieldValue(options[i].values[2])
                        ]);
                        break;
                    default:
                        selections[i] = InputFieldValue(options[i].values);
                        break;
                }
            }
            return selections;
        };

        self.prepareDefaults = function(options) {
            var defaults = self.initSelections(options);
            for (var i = 0; i < options.length; i++) {
                if (options[i].inputType == INPUTTYPE.DROPDOWN)
                    defaults[i] = options[i].values;
            }
            return defaults;
        }

    }

return self;
}