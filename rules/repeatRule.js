var repeatConfig = {
    type: 'Repeat',
    mode: false,
    options: []
};

generaterepeatRule = function () {
    var repeat = generateCustomRule(repeatConfig);
    // helpers
    {
        repeat.draggingHelpers = {
            nextIndex: 0,
            epsilon: 0.001
        };
        repeat.generatesMultipleShapes = true;
        repeat.addPart = function (doUpdate, settings) {
            var button = document.getElementById("addPartButton");
            var partDiv = document.createElement('div');
            partDiv.style = 'margin:0.01em 16px';
            partDiv.id = 'partDiv' + repeat.draggingHelpers.nextIndex;
            var partname = 'part' + repeat.draggingHelpers.nextIndex + '_mode_selector';
            var innerHTML = '<select id=' + partname + '>';
            innerHTML += '<option value="Relative">Relative</option>';
            innerHTML += '<option value="Absolute">Absolute</option>';
            innerHTML += '</select>';
            partDiv.innerHTML += innerHTML;
            var amount_input = document.createElement("input");
            amount_input.setAttribute('type', 'text');
            var inputname = 'part' + repeat.draggingHelpers.nextIndex + '_amount_input_field';
            amount_input.setAttribute('id', inputname);
            partDiv.appendChild(amount_input);
            var addPostfixName = 'part' + repeat.draggingHelpers.nextIndex + '_add_postfix_button';
            var addPostfixButton = document.createElement('button');
            addPostfixButton.id = addPostfixName;
            addPostfixButton.style = 'margin:0px 20px';
            var addPostfixButtonText = document.createTextNode('add Postfix');
            addPostfixButton.appendChild(addPostfixButtonText);
            partDiv.appendChild(addPostfixButton);
            var removename = 'part' + repeat.draggingHelpers.nextIndex + '_remove_button';
            var removeButton = document.createElement('button');
            removeButton.id = removename;
            removeButton.style = 'position:absolute;right:5px';
            var removeButtonText = document.createTextNode('X');
            removeButton.appendChild(removeButtonText);
            partDiv.appendChild(removeButton);
            button.parentNode.insertBefore(partDiv, button);
            $('#' + partname).change(inputChanged);
            $('#' + inputname).change(inputChanged);
            $('#' + addPostfixName).click(repeat.addPostfixFunction(partDiv.id, settings))
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
                    repeat.addPostfix(partDiv.id, settings.postfixes[i]);
                }
            } else {
                amount_input.value = 1;
            }
            this.draggingHelpers.nextIndex++;
            if (!settings && doUpdate) inputChanged();
        };
        repeat.addPostfixFunction = function (partId, settings) {
            return function () {
                repeat.addPostfix(partId, settings);
            }
        };
        repeat.addPostfix = function (partId, settings) {
            part = document.getElementById(partId);
            var possiblePostfixes = ["Goal", "goal", "Tag", "Attribute", "Asset", "Paint", "Orientation", "Reflect", "Void", "Family", "Sync"];
            renderer.postfixController.addPostfix(part, settings, possiblePostfixes, deleteButton = true);
        }
    }
    // standard functions
    repeat.generateRuleString = function () {
        var ruleString = "new Rules.Repeat(" + repeat.axis + ",";
        var counter = 1;
        for (var part in repeat.parts) {
            ruleString += "\n\t\t" + repeat.parts[part].mode + "(" + repeat.parts[part].amount + ")";
            ruleString = addTags(repeat.parts[part], ruleString, 3);
            if (counter < Object.keys(repeat.parts).length) ruleString += ',';
            counter++;
        }
        ruleString += "\n)";
        ruleString = addTags(repeat, ruleString);
        ruleString += ";";
        repeat.lastRuleString = ruleString;
        return ruleString;
    };
    repeat.generateShortString = function () {
        var keys = Object.keys(repeat.parts);
        var size = keys.length;
        return ("Repeat of " + size + " parts.");
    };
    repeat.appendInputFields = function (parentDiv, empty) {
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
            repeat.addPart(true);
        });
        $('#axis_selector').change(inputChanged);
        if (!empty) {
            var selector = document.getElementById("axis_selector");
            for (var i = 0; i < 3; i++) {
                if (selector.options[i].label == repeat.axis) selector.selectedIndex = i;
            }
            for (var i = 0; i < Object.keys(repeat.parts).length; i++) {
                repeat.addPart(true, repeat.parts[Object.keys(repeat.parts)[i]]);
            }
        } else {
            repeat.addPart(false);
            repeat.addPart(false);
        }
    };
    repeat.applyRule = function (shape) {
        var parts = repeat.parts;
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
        switch (repeat.axis) {
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
        repeat.draggingHelpers.fullSize = size;
        repeat.draggingHelpers.width = width;
        repeat.draggingHelpers.height = height;
        var avRel = size - sumAbs;
        var segRelSize = 0;
        repeat.draggingHelpers.partKind = [];
        repeat.draggingHelpers.segments = [];
        repeat.draggingHelpers.input = [];
        for (var i = 0; i < Object.keys(parts).length; i++) {
            var partname = Object.keys(parts)[i];
            if (parts[partname].mode == "Relative") {
                var amount = isNaN(parseFloat(parts[partname].amount)) ? 0 : parseFloat(parts[partname].amount);
                amount = Math.max(repeat.draggingHelpers.epsilon, amount);
                repeat.draggingHelpers.partKind.push('rel');
                var segmentSize = amount / sumRel * avRel
                repeat.draggingHelpers.segments.push(segmentSize);
                repeat.draggingHelpers.input.push(amount);
                segRelSize = segRelSize + segmentSize;
            } else {
                var amount = isNaN(parseFloat(parts[partname].amount)) ? 0 : parseFloat(parts[partname].amount);
                amount = Math.max(repeat.draggingHelpers.epsilon, amount);
                repeat.draggingHelpers.partKind.push('abs');
                repeat.draggingHelpers.segments.push(amount);
                repeat.draggingHelpers.input.push(amount);
            }
        }
        repeat.draggingHelpers.unitsPerInput = 1;
        if (sumRel != 0) repeat.draggingHelpers.unitsPerInput = segRelSize / sumRel;
        repeat.draggingHelpers.sumRel = segRelSize;
    };
    repeat.unapplyRule = function (shape) {
        repeat.draggingHelpers.segments = [1];
    };
    repeat.updateRule = function () {
        repeat.parts = [];
        var selector = document.getElementById("axis_selector");
        var selection = selector.options[selector.selectedIndex].value;
        repeat.axis = selection;
        var sumAbs = 0;
        for (var i = 0; i < repeat.draggingHelpers.nextIndex; i++) {
            var name = 'part' + i + '_mode_selector';
            var modeSelector = document.getElementById(name);
            if (modeSelector) {
                var amountInput = document.getElementById('part' + i + '_amount_input_field');
                var mode = modeSelector.options[modeSelector.selectedIndex].value;
                var amount = amountInput.value;
                if (mode == 'Absolute') sumAbs += parseFloat(amount);
                repeat.parts['part' + i] = { mode: mode, amount: amount };
                var partId = 'partDiv' + i;
                var part = document.getElementById(partId)
                readTags(part, repeat.parts['part' + i]);
            }
        }
        if (!repeat.draggingHelpers.fullSize) repeat.draggingHelpers.fullSize = 99999999;
        if (repeat.draggingHelpers.fullSize < sumAbs - repeat.draggingHelpers.epsilon) {
            repeat.draggingHelpers.dontDraw = true;
            alert("Sum of absolute parts is larger than available size.\nThis would result in an error!");
        } else repeat.draggingHelpers.dontDraw = false;
    };
    repeat.addPreview = function (shape) {
        if (repeat.draggingHelpers.dontDraw) return;
        var offset = -repeat.draggingHelpers.fullSize / 2;
        var scale;
        var translate;
        var mat;
        for (var i = 0; i < repeat.draggingHelpers.segments.length; i++) {
            var m = shape.appearance.transformation;
            m = new THREE.Matrix4().fromArray(m);
            var size = Math.max(0.000001, repeat.draggingHelpers.segments[i]);
            switch (repeat.axis) {
                case 'Axis.X':
                    scale = new THREE.Matrix4().makeScale(size / repeat.draggingHelpers.fullSize, 1, 1);
                    translate = new THREE.Matrix4().makeTranslation(offset + size / 2, 0, 0);
                    break;
                case 'Axis.Y':
                    scale = new THREE.Matrix4().makeScale(1, size / repeat.draggingHelpers.fullSize, 1);
                    translate = new THREE.Matrix4().makeTranslation(0, offset + size / 2, 0);
                    break;
                case 'Axis.Z':
                    scale = new THREE.Matrix4().makeScale(1, 1, size / repeat.draggingHelpers.fullSize);
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
    repeat.removePreview = function (shape) {
        while (self.previewScene.children.length != 0) {
            self.previewScene.remove(self.previewScene.children[0]);
        }
        meshes.delete(shape.id);
        renderer.RenderSingleFrame();
    };
    repeat.createHandles = function (scene, shape) {
        if (repeat.draggingHelpers.dontDraw) return;
        if (!repeat.draggingHelpers.segments) repeat.applyRule(shape.shape);
        this.draggingHelpers.scene = scene;
        var basicColors = [0xAA3030, 0x30AA30, 0x3030AA];
        var highlightColors = [0xFF0000, 0x00FF00, 0x0000FF];
        mat = shape.shape.appearance.transformation;
        var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        center = new THREE.Vector3(0, 0, 0);
        center.applyProjection(m);
        var dir;
        switch (repeat.axis) {
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
        var widthOffset = repeat.draggingHelpers.width / (repeat.draggingHelpers.segments.length - 1);
        var heightOffset = repeat.draggingHelpers.height / (repeat.draggingHelpers.segments.length - 1);
        switch (repeat.axis) {
            case 'Axis.X':
                center.add(new THREE.Vector3(-repeat.draggingHelpers.fullSize / 2, -repeat.draggingHelpers.width / 2 - widthOffset / 2, -repeat.draggingHelpers.height / 2 - heightOffset / 2));
                break;
            case 'Axis.Y':
                center.add(new THREE.Vector3(-repeat.draggingHelpers.width / 2 - widthOffset / 2, -repeat.draggingHelpers.fullSize / 2, -repeat.draggingHelpers.height / 2 - heightOffset / 2));
                break;
            case 'Axis.Z':
                center.add(new THREE.Vector3(-repeat.draggingHelpers.width / 2 - widthOffset / 2, -repeat.draggingHelpers.height / 2 - heightOffset / 2, -repeat.draggingHelpers.fullSize / 2));
                break;
            default:
                break;
        }
        repeat.draggingHelpers.highlight = null;
        var search = 0;
        if (!repeat.draggingHelpers.arrowIds) repeat.draggingHelpers.arrowIds = [];
        if (repeat.draggingHelpers.overHandle) search = repeat.draggingHelpers.overHandle;
        else if (repeat.draggingHelpers.activeHandle) search = repeat.draggingHelpers.activeHandle;
        for (var i = 0; i < repeat.draggingHelpers.arrowIds.length; i++) {
            if (repeat.draggingHelpers.arrowIds[i] <= search && repeat.draggingHelpers.arrowIds[i] + 2 >= search) {
                repeat.draggingHelpers.highlight = Math.floor(i / 2);
            }
        };
        var oldStartingId = repeat.draggingHelpers.arrowIds[0] || 0;
        repeat.draggingHelpers.arrowIds = [];
        var counter = 0;
        for (var i = 0; i < repeat.draggingHelpers.segments.length - 1; i++) {
            var size = Math.max(0.000001, repeat.draggingHelpers.segments[i]);
            switch (repeat.axis) {
                case 'Axis.X':
                    center.add(new THREE.Vector3(size, widthOffset, heightOffset));
                    if (counter == repeat.draggingHelpers.highlight) color = highlightColors[0];
                    else color = basicColors[0];
                    break;
                case 'Axis.Y':
                    center.add(new THREE.Vector3(widthOffset, size, heightOffset));
                    if (counter == repeat.draggingHelpers.highlight) color = highlightColors[1];
                    else color = basicColors[1];
                    break;
                case 'Axis.Z':
                    center.add(new THREE.Vector3(widthOffset, heightOffset, size));
                    if (counter == repeat.draggingHelpers.highlight) color = highlightColors[2];
                    else color = basicColors[2];
                    break;
                default:
                    break;
            }
            counter++;
            var arrowlength = Math.max(repeat.draggingHelpers.fullSize / 5, 0.1);
            var backarrow = new THREE.ArrowHelper(new THREE.Vector3().sub(dir).normalize(), center, arrowlength, color, 0.2, 0.1);
            var arrow = new THREE.ArrowHelper(dir.normalize(), center, arrowlength, color, 0.2, 0.1);
            scene.add(arrow);
            scene.add(backarrow);
            repeat.draggingHelpers.arrowIds.push(arrow.id);
            repeat.draggingHelpers.arrowIds.push(backarrow.id);
        }
        repeat.draggingHelpers.idOffset = repeat.draggingHelpers.arrowIds[0] - oldStartingId;
    };
    repeat.onMouseOverHandle = function (id) {
        oldHandle = repeat.draggingHelpers.overHandle;
        repeat.draggingHelpers.overHandle = id;
        if (repeat.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    repeat.onMouseNotOverHandle = function () {
        oldHandle = repeat.draggingHelpers.overHandle;
        repeat.draggingHelpers.overHandle = null;
        if (repeat.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    repeat.onHandlePressed = function (id, mouse, intersection, scene, camera) {
        id += repeat.draggingHelpers.idOffset;
        var clickedObject = scene.getObjectById(id);
        var arrowPos = clickedObject.parent.position;
        var initStart = arrowPos.clone();
        var initEnd = intersection.clone();
        var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
        var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
        repeat.draggingHelpers.segment = {
            start: start,
            end: end
        };
        repeat.draggingHelpers.directionFactor = 1;
        for (var i = 0; i < repeat.draggingHelpers.arrowIds.length; i++) {
            if (repeat.draggingHelpers.arrowIds[i] <= id && repeat.draggingHelpers.arrowIds[i] + 2 >= id) {
                repeat.draggingHelpers.beforeActiveCut = Math.floor(i / 2);
                if (i.isOdd()) repeat.draggingHelpers.directionFactor = -1;
            }
        }
        repeat.draggingHelpers.startingSegments = repeat.draggingHelpers.segments.slice();
        repeat.draggingHelpers.startingInput = repeat.draggingHelpers.input.slice();
        repeat.draggingHelpers.cam = camera;
        repeat.draggingHelpers.intersection = intersection;
        repeat.draggingHelpers.arrowPos = arrowPos;
        repeat.draggingHelpers.activeHandle = id;
    };
    repeat.onHandleDragged = function (mouse) {
        var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
        mousePoint.unproject(repeat.draggingHelpers.cam);
        var mouseRay = new THREE.Ray(repeat.draggingHelpers.cam.position, mousePoint.sub(repeat.draggingHelpers.cam.position).normalize());
        var targetPoint = new THREE.Vector3();
        mouseRay.distanceSqToSegment(repeat.draggingHelpers.segment.start,
            repeat.draggingHelpers.segment.end,
            null,
            targetPoint);
        var diff = targetPoint.sub(repeat.draggingHelpers.intersection);
        var length = diff.length();
        var direction = repeat.draggingHelpers.intersection.clone().sub(repeat.draggingHelpers.arrowPos);
        var angle = diff.normalize().angleTo(direction.normalize());
        if (angle > (0.5 * Math.PI)) length *= -1;
        length *= repeat.draggingHelpers.directionFactor;
        if (length > 0) {
            toReduce = repeat.draggingHelpers.beforeActiveCut + 1;
            toEnlarge = repeat.draggingHelpers.beforeActiveCut;
        } else {
            toReduce = repeat.draggingHelpers.beforeActiveCut;
            toEnlarge = repeat.draggingHelpers.beforeActiveCut + 1;
        }
        var inputs = repeat.draggingHelpers.startingInput.slice();
        var segments = repeat.draggingHelpers.startingSegments.slice();
        var types = repeat.draggingHelpers.partKind.slice();
        var maxMovement = segments[toReduce];
        length = Math.min(maxMovement, Math.abs(length));
        var nrRel = 0;
        for (var i = 0; i < segments.length; i++) {
            if (types[i] == 'rel') nrRel++;
        }
        if (nrRel == 1) {
            if (types[toReduce] == 'rel') {
                segments[toEnlarge] += length;
                segments[toReduce] = inputs[toReduce] * repeat.draggingHelpers.unitsPerInput;
            } else if (types[toEnlarge] == 'rel') {
                segments[toReduce] -= length;
                segments[toEnlarge] = inputs[toEnlarge] * repeat.draggingHelpers.unitsPerInput;
            } else {
                segments[toReduce] -= length;
                segments[toEnlarge] += length;
            }
        } else {
            segments[toReduce] -= length;
            segments[toEnlarge] += length;
        }
        var counter = 0;
        for (var i = 0; i < repeat.draggingHelpers.nextIndex; i++) {
            amountInput = document.getElementById('part' + i + '_amount_input_field');
            if (amountInput) {
                if (counter == toReduce || counter == toEnlarge) {
                    if (types[counter] == 'abs') {
                        amountInput.value = Math.max(repeat.draggingHelpers.epsilon, segments[counter]).round();
                    } else {
                        if (isNaN(segments[counter] / repeat.draggingHelpers.unitsPerInput)) {
                            var amount = inputs[counter];
                        } else if (isFinite(segments[counter] / repeat.draggingHelpers.unitsPerInput)) {
                            var amount = segments[counter] / repeat.draggingHelpers.unitsPerInput;
                        } else {
                            var amount = inputs[counter];
                        }
                        amountInput.value = Math.max(repeat.draggingHelpers.epsilon, amount).round();
                    }
                }
                counter++;
            }
        }
        inputChanged();
    };
    repeat.onHandleReleased = function () {
        oldHandle = repeat.draggingHelpers.activeHandle;
        repeat.draggingHelpers.activeHandle = null;
        if (repeat.draggingHelpers.activeHandle != oldHandle) inputChanged();
    };
    repeat.parseCode = function(ruleBuffer) {
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
        repeat.parts = [];
        var partCounter = 0;
        var DEFAULT = 0, PART = 1;
        var parseMode = DEFAULT;
        var mode, amount;
        counter = 0;
        while (counter < ruleBuffer.length) {
            current = ruleBuffer[counter]
            switch(parseMode) {
                case DEFAULT:
                    if (current.RawKind == 8508) {
                        if (current.Text == 'X') {
                            repeat.axis = "Axis.X";
                        } else if (current.Text == 'Y') {
                            repeat.axis = "Axis.Y";
                        } else if (current.Text == 'Z') {
                            repeat.axis = "Axis.Z";
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
                        part = { mode: mode, amount: current.Text };
                        [part, used] = renderer.postfixController.parsePostfixes(part, ruleBuffer.slice(counter, endOfRule));
                        if (!part.postfixes) part.postfixes = [];
                        counter += used;
                        repeat.parts['part' + partCounter] = part;
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
    return repeat;
};

getRuleController().addRuleFactory(repeatConfig.type, generaterepeatRule);