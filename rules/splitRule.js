var splitConfig = {
    type: 'Split',
    mode: false,
    options: []
};

generateSplitRule = function () {

    var split = generateCustomRule(splitConfig);
    split.parts = [];
    // helpers
    {
        split.draggingHelpers = {
            nextIndex: 0,
            epsilon: 0.001
        };

        split.generatesMultipleShapes = true;

        split.addPart = function (doUpdate, settings) {
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
            if (!settings && doUpdate) inputChanged();
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
            ruleString = addTags(split.parts[part], ruleString, 3);
            if (counter < Object.keys(split.parts).length) ruleString += ',';
            counter++;
        }
        ruleString += "\n)";
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
            split.addPart(true);
        });
        $('#axis_selector').change(inputChanged);

        if (!empty) {
            var selector = document.getElementById("axis_selector");
            for (var i = 0; i < 3; i++) {
                if (selector.options[i].label == split.axis) selector.selectedIndex = i;
            }
            for (var i = 0; i < Object.keys(split.parts).length; i++) {
                split.addPart(true, split.parts[Object.keys(split.parts)[i]]);
            }
        } else {
            split.addPart(false);
            split.addPart(false);
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
                split.parts['part' + i] = {mode: mode, amount: amount};

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

        if (!split.draggingHelpers.segments) split.applyRule(shape.shape);

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
        }
        ;

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
    split.parseCode = function (ruleBuffer) {
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

        split.parts = [];
        var partCounter = 0;

        var DEFAULT = 0, PART = 1;
        var parseMode = DEFAULT;

        var mode, amount;

        counter = 0;
        while (counter < ruleBuffer.length) {
            current = ruleBuffer[counter]
            switch (parseMode) {
                case DEFAULT:
                    if (current.RawKind == 8508) {
                        if (current.Text == 'X') {
                            split.axis = "Axis.X";
                        } else if (current.Text == 'Y') {
                            split.axis = "Axis.Y";
                        } else if (current.Text == 'Z') {
                            split.axis = "Axis.Z";
                        } else if (current.Text == "Relative") {
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
                        part = {mode: mode, amount: current.Text};
                        [part, used] = renderer.postfixController.parsePostfixes(part, ruleBuffer.slice(counter, endOfRule));
                        if (!part.postfixes) part.postfixes = [];
                        counter += used;
                        split.parts['part' + partCounter] = part;
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

    return split;
};

getRuleController().addRuleFactory(splitConfig.type, generateSplitRule);
