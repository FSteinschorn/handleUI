scaleConfig = {
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

    var scale = generateCustomRule(scaleConfig);

    scale.applyRule = function (shape) {
        var matrix = new THREE.Matrix4();
        matrix.makeScale(
            this.selections[0].toNumber()[0],
            this.selections[0].toNumber()[1],
            this.selections[0].toNumber()[2]);
        var m = shape.appearance.transformation;
        var mat = new THREE.Matrix4().fromArray(m).transpose();
        if (this.mode == "Mode.Local") {
            var xSize = new THREE.Vector3(m[0], m[1], m[2]).length();
            var ySize = new THREE.Vector3(m[4], m[5], m[6]).length();
            var zSize = new THREE.Vector3(m[8], m[9], m[10]).length();
            var translation = new THREE.Matrix4().makeTranslation(
                xSize * (this.selections[0].toNumber()[0] - 1) / 2,
                ySize * (this.selections[0].toNumber()[1] - 1) / 2,
                zSize * (this.selections[0].toNumber()[2] - 1) / 2
            );
            mat.multiply(translation);
            mat.multiply(matrix);
        } else if (this.mode == "Mode.LocalMid") {
            mat.multiply(matrix);
        } else if (this.mode == "Mode.Global") {
            mat.premultiply(matrix);
        } else if (this.mode == "Mode.GlobalMid") {
            mat.multiply(matrix);
        }
        shape.appearance.transformation = mat.transpose().toArray();
    };
    scale.unapplyRule = function (shape) {
        var matrix = new THREE.Matrix4();
        matrix.makeScale(
            1 / this.selections[0].toNumber()[0],
            1 / this.selections[0].toNumber()[1],
            1 / this.selections[0].toNumber()[2]);
        var m = shape.appearance.transformation;
        var mat = new THREE.Matrix4().fromArray(m).transpose();
        if (this.mode == "Mode.Local") {
            var xSize = new THREE.Vector3(m[0], m[1], m[2]).length();
            var ySize = new THREE.Vector3(m[4], m[5], m[6]).length();
            var zSize = new THREE.Vector3(m[8], m[9], m[10]).length();
            var translation = new THREE.Matrix4().makeTranslation(
                -(xSize / 2) + (xSize / this.selections[0].toNumber()[0] / 2),
                -(ySize / 2) + (ySize / this.selections[0].toNumber()[1] / 2),
                -(zSize / 2) + (zSize / this.selections[0].toNumber()[2] / 2)
            );
            mat.multiply(matrix);
            mat.multiply(translation);
        } else if (this.mode == "Mode.LocalMid") {
            mat.multiply(matrix);
        } else if (this.mode == "Mode.Global") {
            mat.premultiply(matrix);
        } else if (this.mode == "Mode.GlobalMid") {
            mat.multiply(matrix);
        }
        shape.appearance.transformation = mat.transpose().toArray();
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

        var m = shape.appearance.transformation;
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
        var oldHandle = this.draggingHelpers.overHandle;
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
        var oldHandle = this.draggingHelpers.overHandle;
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
        };

        var inputFieldController = getInputFieldController();
        var value = inputFieldController.getValue(this.fieldIds[0]);
        this.draggingHelpers.startValues = jQuery.extend(true, [], value);
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

        var newValues = this.draggingHelpers.startValues.toNumber();
        switch (this.draggingHelpers.activeHandle) {
            case 'x':
                var scaleFactor = this.draggingHelpers.startSizeX * newValues[0] + length;
                scaleFactor = scaleFactor / this.draggingHelpers.startSizeX;
                newValues[0] = scaleFactor.round();
                break;
            case 'y':
                var scaleFactor = this.draggingHelpers.startSizeY * newValues[1] + length;
                scaleFactor = scaleFactor / this.draggingHelpers.startSizeY;
                newValues[1] = scaleFactor.round();
                break;
            case 'z':
                var scaleFactor = this.draggingHelpers.startSizeZ * newValues[2] + length;
                scaleFactor = scaleFactor / this.draggingHelpers.startSizeZ;
                newValues[2] = scaleFactor.round();
                break;
        }

        var inputFieldController = getInputFieldController();
        var inputFieldValues = jQuery.extend(true, [], this.draggingHelpers.startValues);
        inputFieldValues.setValue(newValues);
        inputFieldController.setValue(this.fieldIds[0], inputFieldValues);

        inputChanged();
    };
    scale.onHandleReleased = function () {
        var oldHandle = this.draggingHelpers.activeHandle;
        this.draggingHelpers.activeHandle = null;
        if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
    };

    return scale;
};

getRuleController().addRuleFactory(scaleConfig.type, generateScaleRule);