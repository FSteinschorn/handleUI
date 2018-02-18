var repeatConfig = {
    type: 'Repeat',
    mode: false,
    options: []
};

generaterepeatRule = function () {
    var repeat = generateCustomRule(repeatConfig);
    repeat.parts = [];
    // helpers
    {
        repeat.draggingHelpers = {
            nextIndex: 0,
            epsilon: 0.001
        };
        repeat.generatesMultipleShapes = true;
        repeat.addPart = function (doUpdate, settings) {
            var partDiv = document.createElement('div');
            partDiv.style = 'margin:0.01em 16px';
            partDiv.id = 'partDiv' + this.draggingHelpers.nextIndex;
            var partname = 'part' + this.draggingHelpers.nextIndex + '_mode_selector';
            var innerHTML = "Absolute: ";
            partDiv.innerHTML += innerHTML;
            var amount_input = document.createElement("input");
            amount_input.setAttribute('type', 'text');
            var inputname = 'part' + this.draggingHelpers.nextIndex + '_amount_input_field';
            amount_input.setAttribute('id', inputname);
            partDiv.appendChild(amount_input);
            var addPostfixName = 'part' + this.draggingHelpers.nextIndex + '_add_postfix_button';
            var addPostfixButton = document.createElement('button');
            addPostfixButton.id = addPostfixName;
            addPostfixButton.style = 'margin:0px 20px';
            var addPostfixButtonText = document.createTextNode('add Postfix');
            addPostfixButton.appendChild(addPostfixButtonText);
            partDiv.appendChild(addPostfixButton);
            var inputDiv = document.getElementById("inputDiv");
            inputDiv.appendChild(partDiv);
            $('#' + partname).change(inputChanged);
            $('#' + inputname).change(inputChanged);
            $('#' + addPostfixName).click(this.addPostfixFunction(partDiv.id, settings));
            if (settings) {
                var selector = document.getElementById(partname);
                for (var i = 0; i < 2; i++) {
                    if (selector.options[i].label == settings.mode) selector.selectedIndex = i;
                }
                amount_input.value = settings.amount;
                for (var i = 0; i < Object.keys(settings.postfixes).length; i++) {
                    this.addPostfix(partDiv.id, settings.postfixes[i]);
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
            var part = document.getElementById(partId);
            var possiblePostfixes = ["Goal", "goal", "Tag", "Attribute", "Asset", "Paint", "Orientation", "Reflect", "Void", "Family", "Sync"];
            renderer.postfixController.addPostfix(part, settings, possiblePostfixes, deleteButton = true);
        };
    }
    // standard functions
    repeat.generateRuleString = function () {
        var ruleString = "new Rules.Repeat(" + this.axis + ",";
        var counter = 1;
        for (var part in this.parts) {
            ruleString += "\n\t\t" + this.parts[part].mode + "(" + this.parts[part].amount + ")";
            ruleString = addTags(this.parts[part], ruleString, 3);
            if (counter < Object.keys(this.parts).length) ruleString += ',';
            counter++;
        }
        ruleString += "\n)";
        ruleString = addTags(repeat, ruleString);
        ruleString += ";";
        this.lastRuleString = ruleString;
        return ruleString;
    };
    repeat.generateShortString = function () {
        var keys = Object.keys(this.parts);
        var size = keys.length;
        var partname = keys[0];
        return ("Repeat of part of size " + this.parts[partname].amount + " " + this.parts[partname].mode);
    };
    repeat.appendInputFields = function (parentDiv, empty) {
        var innerHTML = '<select id="axis_selector">';
        innerHTML += '<option value="Axis.X">Axis.X</option>';
        innerHTML += '<option value="Axis.Y">Axis.Y</option>';
        innerHTML += '<option value="Axis.Z">Axis.Z</option>';
        innerHTML += '</select>'
        parentDiv.innerHTML += innerHTML;
        $('#axis_selector').change(inputChanged);
        if (!empty) {
            var selector = document.getElementById("axis_selector");
            for (var i = 0; i < 3; i++) {
                if (selector.options[i].label == this.axis) selector.selectedIndex = i;
            }
            for (var i = 0; i < Object.keys(this.parts).length; i++) {
                this.addPart(true, this.parts[Object.keys(this.parts)[i]]);
            }
        } else {
            this.addPart(false);
        }
    };
    repeat.applyRule = function (shape) {
        var parts = this.parts;
        var partname = Object.keys(parts)[0];
        if (Object.keys(parts).length == 0) parts[partname] = { mode: "Relative", amount: 1.0 };
        var targetSize = isNaN(parseFloat(parts[partname].amount)) ? -1 : parseFloat(parts[partname].amount);
        if (targetSize <= 0) return;
        var mode = parts[partname].mode;

        var m = shape.appearance.transformation;
        var xDir = new THREE.Vector3(m[0], m[1], m[2]);
        var yDir = new THREE.Vector3(m[4], m[5], m[6]);
        var zDir = new THREE.Vector3(m[8], m[9], m[10]);
        var size, width, height;
        if (!this.axis) this.axis = "Axis.X";
        switch (this.axis) {
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

        if (mode == "Relative") targetSize = targetSize * size;

        var nrParts = size/targetSize;
        if (nrParts - Math.floor(nrParts) < Math.ceil(nrParts) - nrParts) nrParts = Math.floor(nrParts);
        else nrParts = Math.ceil(nrParts);

        this.draggingHelpers.segments = [];
        this.draggingHelpers.partKind = [];
        this.draggingHelpers.input = [];
        for (var i = 0; i < nrParts; i++) {
            this.draggingHelpers.segments.push(size / nrParts);
            this.draggingHelpers.partKind.push('Absolute');
            this.draggingHelpers.input.push(targetSize);
        }

        this.draggingHelpers.unitsPerInput = 1;
        this.draggingHelpers.sumRel = 1;
    };
    repeat.unapplyRule = function (shape) {
        this.draggingHelpers.segments = [1];
    };
    repeat.updateRule = function () {
        this.parts = [];
        var selector = document.getElementById("axis_selector");
        var selection = selector.options[selector.selectedIndex].value;
        this.axis = selection;
        var sumAbs = 0;
        for (var i = 0; i < this.draggingHelpers.nextIndex; i++) {
            var amountInput = document.getElementById('part' + i + '_amount_input_field');
            var mode = 'Absolute';
            var amount = amountInput.value;
            if (mode == 'Absolute') sumAbs += parseFloat(amount);
            this.parts['part' + i] = {mode: mode, amount: amount};
            var partId = 'partDiv' + i;
            var part = document.getElementById(partId)
            readTags(part, this.parts['part' + i]);
        }
        if (!this.draggingHelpers.fullSize) this.draggingHelpers.fullSize = 99999999;
        if (this.draggingHelpers.fullSize < sumAbs - this.draggingHelpers.epsilon) {
            this.draggingHelpers.dontDraw = true;
            alert("Sum of absolute parts is larger than available size.\nThis would result in an error!");
        } else this.draggingHelpers.dontDraw = false;
    };
    repeat.addPreview = function (shape, color) {
        if (this.draggingHelpers.dontDraw) return;
        var offset = -this.draggingHelpers.fullSize / 2;
        var scale;
        var translate;
        for (var i = 0; i < this.draggingHelpers.segments.length; i++) {
            var m = shape.appearance.transformation;
            m = new THREE.Matrix4().fromArray(m);
            var size = Math.max(0.000001, this.draggingHelpers.segments[i]);
            switch (this.axis) {
                case 'Axis.X':
                    scale = new THREE.Matrix4().makeScale(size / this.draggingHelpers.fullSize, 1, 1);
                    translate = new THREE.Matrix4().makeTranslation(offset + size / 2, 0, 0);
                    break;
                case 'Axis.Y':
                    scale = new THREE.Matrix4().makeScale(1, size / this.draggingHelpers.fullSize, 1);
                    translate = new THREE.Matrix4().makeTranslation(0, offset + size / 2, 0);
                    break;
                case 'Axis.Z':
                    scale = new THREE.Matrix4().makeScale(1, 1, size / this.draggingHelpers.fullSize);
                    translate = new THREE.Matrix4().makeTranslation(0, 0, offset + size / 2);
                    break;
                default:
                    break;
            }
            offset += size;
            m.premultiply(scale);
            m.multiply(translate.transpose());
            var segmentShape = jQuery.extend(true, {}, shape);
            segmentShape.appearance.transformation = m.toArray();
            getRuleController().addPreview(segmentShape, color);
        }
    };
    repeat.removePreview = function (shape) {
        while (getRuleController().previewScene.children.length != 0) {
            getRuleController().previewScene.remove(getRuleController().previewScene.children[0]);
        }
        getRuleController().meshes.delete(shape.id);
        renderer.RenderSingleFrame();
    };
    repeat.createHandles = function (scene, shape) {
        if (this.draggingHelpers.dontDraw) return;
        if (!this.draggingHelpers.segments) this.applyRule(shape.shape);
        this.draggingHelpers.scene = scene;
        var basicColors = [0xAA3030, 0x30AA30, 0x3030AA];
        var highlightColors = [0xFF0000, 0x00FF00, 0x0000FF];
        mat = shape.shape.appearance.transformation;
        var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        center = new THREE.Vector3(0, 0, 0);
        center.applyProjection(m);
        var dir;
        switch (this.axis) {
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
        switch (this.axis) {
            case 'Axis.X':
                center.add(new THREE.Vector3(-this.draggingHelpers.fullSize / 2, 0, 0));
                break;
            case 'Axis.Y':
                center.add(new THREE.Vector3(0, -this.draggingHelpers.fullSize / 2, 0));
                break;
            case 'Axis.Z':
                center.add(new THREE.Vector3(0, 0, -this.draggingHelpers.fullSize / 2));
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
        }
        var oldStartingId = this.draggingHelpers.arrowIds[0] || 0;
        this.draggingHelpers.arrowIds = [];
        var parts = this.parts;
        var partname = Object.keys(parts)[0];
        var targetSize = isNaN(parseFloat(parts[partname].amount)) ? -1 : parseFloat(parts[partname].amount);
        var mode = parts[partname].mode;
        if (mode == "Relative") targetSize = targetSize * this.draggingHelpers.fullSize;
        switch (this.axis) {
            case 'Axis.X':
                center.add(new THREE.Vector3(targetSize, 0, 0));
                if (0 == this.draggingHelpers.highlight) color = highlightColors[0];
                else color = basicColors[0];
                break;
            case 'Axis.Y':
                center.add(new THREE.Vector3(0, targetSize, 0));
                if (0 == this.draggingHelpers.highlight) color = highlightColors[1];
                else color = basicColors[1];
                break;
            case 'Axis.Z':
                center.add(new THREE.Vector3(0, 0, targetSize));
                if (0 == this.draggingHelpers.highlight) color = highlightColors[2];
                else color = basicColors[2];
                break;
            default:
                break;
        }
        var arrowlength = Math.max(this.draggingHelpers.fullSize / 5, 0.1);
        var backarrow = new THREE.ArrowHelper(new THREE.Vector3().sub(dir).normalize(), center, arrowlength, color, 0.2, 0.1);
        var arrow = new THREE.ArrowHelper(dir.normalize(), center, arrowlength, color, 0.2, 0.1);
        scene.add(arrow);
        scene.add(backarrow);
        this.draggingHelpers.arrowIds.push(arrow.id);
        this.draggingHelpers.arrowIds.push(backarrow.id);
        this.draggingHelpers.idOffset = this.draggingHelpers.arrowIds[0] - oldStartingId;
    };
    repeat.onMouseOverHandle = function (id) {
        oldHandle = this.draggingHelpers.overHandle;
        this.draggingHelpers.overHandle = id;
        if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    repeat.onMouseNotOverHandle = function () {
        oldHandle = this.draggingHelpers.overHandle;
        this.draggingHelpers.overHandle = null;
        if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    repeat.onHandlePressed = function (id, mouse, intersection, scene, camera) {
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
        };
        this.draggingHelpers.directionFactor = 1;
        for (var i = 0; i < this.draggingHelpers.arrowIds.length; i++) {
            if (this.draggingHelpers.arrowIds[i] <= id && this.draggingHelpers.arrowIds[i] + 2 >= id) {
                this.draggingHelpers.beforeActiveCut = Math.floor(i / 2);
                if (i.isOdd()) this.draggingHelpers.directionFactor = -1;
            }
        }
        this.draggingHelpers.startingSegments = this.draggingHelpers.segments.slice();
        this.draggingHelpers.startingInput = this.draggingHelpers.input.slice();
        this.draggingHelpers.cam = camera;
        this.draggingHelpers.intersection = intersection;
        this.draggingHelpers.arrowPos = arrowPos;
        this.draggingHelpers.activeHandle = id;
    };
    repeat.onHandleDragged = function (mouse) {
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

        var inputs = this.draggingHelpers.startingInput.slice();

        var partname = Object.keys(this.parts)[0];

        if (this.parts[partname].mode == "Relative") length = length / this.draggingHelpers.fullSize;

        var amountInput = document.getElementById(partname + '_amount_input_field');
        var value;
        if (this.parts[partname].mode == "Relative") {
            value = Math.max(this.draggingHelpers.epsilon, inputs[0] / this.draggingHelpers.fullSize + length).round();
            value = Math.min(1.0, value).round();
        } else {
            value = Math.max(this.draggingHelpers.epsilon, inputs[0] + length).round();
            value = Math.min(this.draggingHelpers.fullSize, value).round();
        }
        amountInput.value = value;

        inputChanged();
    };
    repeat.onHandleReleased = function () {
        oldHandle = this.draggingHelpers.activeHandle;
        this.draggingHelpers.activeHandle = null;
        if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
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
        this.parts = [];
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
                            this.axis = "Axis.X";
                        } else if (current.Text == 'Y') {
                            this.axis = "Axis.Y";
                        } else if (current.Text == 'Z') {
                            this.axis = "Axis.Z";
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
                        this.parts['part' + partCounter] = part;
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
    repeat.storeCurrentState = function() {
        this.storedState = jQuery.extend(true, [], this.parts);
    };
    repeat.setStoredState = function() {
        var partname = Object.keys(this.parts)[0];
        var amountInput = document.getElementById(partname + '_amount_input_field');
        var selector = document.getElementById(partname + '_mode_selector');
        var idx = partname[partname.length -1];
        this.parts = this.storedState;
        partname = Object.keys(this.parts)[0];
        amountInput.value = this.parts[partname].amount;
        for (var i = 0; i < 2; i++) {
            if (selector.options[i].label == this.parts[partname].mode) selector.selectedIndex = i;
        }
        for (var i = 0; i < Object.keys(this.parts[partname].postfixes).length; i++) {
            this.addPostfix('partDiv' + idx, this.parts[partname].postfixes[i]);
        }
    };
    return repeat;
};

getRuleController().addRuleFactory(repeatConfig.type, generaterepeatRule);