var axes = ["Axis.X", "Axis.Y", "Axis.Z"];
var degrad = ["deg", "rad"];
rotationConfig = {
    type: 'Rotate',
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
        if (this.selections[2].getValue() == "deg") amount = "Deg(" + this.selections[1].toNumber() + ")";
        else if (this.selections[2].getValue() == "rad") amount = "Rad(" + this.selections[1].toNumber() + ")";
        var ruleString = "new Rules.Rotate(" + this.selections[0].getValue() + ", " + amount + ", " + this.mode + ")";
        ruleString = addTags(rotation, ruleString);
        ruleString += ";";

        this.lastRuleString = ruleString;

        return ruleString;
    };
    rotation.generateShortString = function () {
        return ("Rotation by " + this.selections[1].toNumber()
            + " " + this.selections[2].getValue()
            + " on " + this.selections[0].getValue() + ", " + this.mode);
    };
    rotation.applyRule = function (shape) {
        var amount = -this.selections[1].toNumber();
        if (this.selections[2].getValue() == 'deg') {
            amount = Math.PI * amount / 180;
        }

        var mat = shape.appearance.transformation;
        this.lastTransform = mat;
        var m = new THREE.Matrix4().fromArray(mat);
        m.transpose();
        var translation = new THREE.Matrix4().copyPosition(m).transpose();
        m.transpose();

        var matrix = new THREE.Matrix4();
        switch (this.selections[0].getValue()) {
            case 'Axis.X':
                matrix.makeRotationX(amount);
                break;
            case 'Axis.Y':
                matrix.makeRotationY(amount);
                break;
            case 'Axis.Z':
                matrix.makeRotationZ(amount);
                break;
            default:
                break;
        }

        if (this.mode == "Mode.Local") {
            var sizeX = new THREE.Vector3(mat[0], mat[1], mat[2]).length();
            var sizeY = new THREE.Vector3(mat[4], mat[5], mat[6]).length();
            var sizeZ = new THREE.Vector3(mat[8], mat[9], mat[10]).length();
            var pivot_offset = new THREE.Matrix4();
            switch (this.selections[0].getValue()) {
                case 'Axis.X':
                    pivot_offset.makeTranslation(0, sizeY / 2, sizeZ / 2);
                    break;
                case 'Axis.Y':
                    pivot_offset.makeTranslation(sizeX / 2, 0, sizeZ / 2);
                    break;
                case 'Axis.Z':
                    pivot_offset.makeTranslation(sizeX / 2, sizeY / 2, 0);
                    break;
                default:
                    break;
            }
            pivot_offset.transpose();

            m.multiply(pivot_offset);
            m.multiply(translation.getInverse(translation));
            m.multiply(matrix);
            m.multiply(translation.getInverse(translation));
            m.multiply(pivot_offset.getInverse(pivot_offset));
        }
        if (this.mode == "Mode.LocalMid" || this.mode == "Mode.GlobalMid") {
            m.multiply(translation.getInverse(translation));
            m.multiply(matrix);
            m.multiply(translation.getInverse(translation));
        }
        if (this.mode == "Mode.Global") {
            m.multiply(matrix);
        }
        shape.appearance.transformation = m.toArray();
    };
    rotation.unapplyRule = function (shape) {
        if (this.lastTransform)
            shape.appearance.transformation = this.lastTransform;
    };
    rotation.createHandles = function (scene, shape) {
        this.draggingHelpers.scene = scene;

        if (!this.initialTransform) this.initialTransform = shape.appearance.transformation;

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
        var material = null;
        var rotationMat = new THREE.Matrix4();
        switch (this.selections[0].getValue()) {
            case 'Axis.X':
                material = new THREE.LineBasicMaterial({color: colors[0]});
                rotationMat.makeRotationY(Math.PI / 2);
                break;
            case 'Axis.Y':
                material = new THREE.LineBasicMaterial({color: colors[1]});
                rotationMat.makeRotationX(Math.PI / 2);
                break;
            case 'Axis.Z':
                material = new THREE.LineBasicMaterial({color: colors[2]});
                rotationMat.makeRotationZ(0);
                break;
            default:
                break;
        }

        // Generate circle geometry
        var radius = 0.8;
        var segments = 64;
        var geometry = new THREE.CircleGeometry(radius, segments);

        // Remove center vertex
        geometry.vertices.shift();

        // Move circle to correct position
        var mat = this.initialTransform;
        var m = new THREE.Matrix4().fromArray(mat).transpose();
        switch(this.mode) {
            case 'Mode.Local':
                var sizeX = new THREE.Vector3(mat[0], mat[1], mat[2]).length();
                var sizeY = new THREE.Vector3(mat[4], mat[5], mat[6]).length();
                var sizeZ = new THREE.Vector3(mat[8], mat[9], mat[10]).length();
                var pivot_offset = new THREE.Matrix4();
                switch (this.selections[0].getValue()) {
                    case 'Axis.X':
                        pivot_offset.makeTranslation(0, -sizeY / 2, -sizeZ / 2);
                        break;
                    case 'Axis.Y':
                        pivot_offset.makeTranslation(-sizeX / 2, 0, -sizeZ / 2);
                        break;
                    case 'Axis.Z':
                        pivot_offset.makeTranslation(-sizeX / 2, -sizeY / 2, 0);
                        break;
                    default:
                        break;
                }

                var maxScale = m.getMaxScaleOnAxis();
                var scale = new THREE.Matrix4().makeScale(maxScale, maxScale, maxScale);

                var translation = new THREE.Matrix4().copyPosition(m);

                geometry.applyMatrix(rotationMat);
                geometry.applyMatrix(scale);
                geometry.applyMatrix(translation);
                geometry.applyMatrix(pivot_offset);
                break;

            case 'Mode.LocalMid':
            case 'Mode.GlobalMid':
                var maxScale = m.getMaxScaleOnAxis();
                var scale = new THREE.Matrix4().makeScale(maxScale, maxScale, maxScale);

                var translation = new THREE.Matrix4().copyPosition(m);

                geometry.applyMatrix(rotationMat);
                geometry.applyMatrix(scale);
                geometry.applyMatrix(translation);
                break;

            case 'Mode.Global':

                var translation = new THREE.Matrix4().copyPosition(m);

                var position = new THREE.Vector4();
                position.applyMatrix4(translation);

                switch(this.selections[0].getValue()) {
                    case 'Axis.X':
                        translation.elements[13] = 0;
                        translation.elements[14] = 0;
                        position.x = 0;
                        break;
                    case 'Axis.Y':
                        translation.elements[12] = 0;
                        translation.elements[14] = 0;
                        position.y = 0;
                        break;
                    case 'Axis.Z':
                        translation.elements[12] = 0;
                        translation.elements[13] = 0;
                        position.z = 0;
                        break;
                    default:
                        break;
                }

                var newRadius = position.length();
                var scale = new THREE.Matrix4().makeScale(newRadius, newRadius, newRadius);

                geometry.applyMatrix(rotationMat);
                geometry.applyMatrix(scale);
                geometry.applyMatrix(translation);

                break;

            default:
                break;
        }

        // Generate circle
        var circle = new THREE.Line(geometry, material);
        scene.add(circle);
        this.draggingHelpers.id = circle.id;
    };
    rotation.onMouseOverHandle = function (id) {
        if (this.draggingHelpers.overHandle) var oldHandle = this.draggingHelpers.overHandle;
        switch (this.selections[0]) {
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
        var oldHandle = this.draggingHelpers.overHandle;
        this.draggingHelpers.overHandle = null;
        if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    rotation.onHandlePressed = function (id, mouse, intersection, scene, camera) {
        this.draggingHelpers.cam = camera;
        this.draggingHelpers.activeHandle = id;
        this.draggingHelpers.intersection = intersection;
        this.draggingHelpers.scene = scene;
        this.draggingHelpers.startValue = this.selections[1];

        var segment = this.draggingHelpers.scene.getObjectById(id);
        this.draggingHelpers.vertices = segment.geometry.vertices;
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
        var direction = -1;
        if (viewingAngle < (0.5 * Math.PI)) direction *= -1;
        if (standardAngle > (0.5 * Math.PI)) direction *= -1;
        if (this.selections[0].getValue() == "Axis.Y") direction *= -1;

        // calc rotation angle
        var angle = startDir.angleTo(endDir);

        // update input fields
        var inputFieldController = getInputFieldController();
        var newValue = jQuery.extend(true, [], this.draggingHelpers.startValue);
        if (this.selections[2].getValue() == "rad") {
            newValue.setValue((this.draggingHelpers.startValue.toNumber() + direction * angle).round());
        } else {
            newValue.setValue((this.draggingHelpers.startValue.toNumber() + direction * ((angle * 180) / Math.PI)).round());
        }
        inputFieldController.setValue(this.fieldIds[1], newValue);

        inputChanged();
    };
    rotation.onHandleReleased = function () {
        var oldHandle = this.draggingHelpers.activeHandle;
        this.draggingHelpers.activeHandle = null;
        if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
    };
    rotation.parseCode = function(ruleBuffer) {
        this.selections = [InputFieldValue(), InputFieldValue(), InputFieldValue()];
        var counter = 0;
        var minus = false;
        var current = null;
        var next = 'axis';
        var done = false;
        while(counter < ruleBuffer.length && !done) {
            current = ruleBuffer[counter];
            switch (next) {
                case 'axis':
                    if (current.RawKind == 8508
                        && current.Text == "Axis"
                        && ruleBuffer[counter + 1].Text == '.'
                        && ruleBuffer[counter + 2].RawKind == 8508) {
                        this.selections[0].setValue(current.Text + '.' + ruleBuffer[counter + 2].Text);
                        counter += 3;
                        next = 'degrad';
                    } else {
                        counter += 1;
                    }
                    break;
                case 'degrad':
                    if (current.RawKind == 8508) {
                        this.selections[2].setValue(current.Text.toLowerCase());
                        counter += 1;
                        next = 'amount';
                    } else {
                        counter += 1;
                    }
                    break;
                case 'amount':
                    if (current.Text == '-' && current.RawKind == 8202) {
                        minus = true;
                    } else if (current.RawKind == 8509) {
                        if (minus)
                            this.selections[1].setValue(-parseFloat(current.Text));
                        else
                            this.selections[1].setValue(parseFloat(current.Text));
                        done = true;
                    }
                    counter += 1;
                    break;
                default:
                    break;
            }
        }

        counter += parseMode(ruleBuffer.slice(counter), this);
        return counter;
    };

    return rotation;
};

getRuleController().addRuleFactory(rotationConfig.type, generateRotationRule);