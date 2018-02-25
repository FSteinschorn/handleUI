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
};

generatethisRule = function () {
    var translation = generateCustomRule(translateConfig);
    translation.applyRule = function (shape) {
        var matrix = new THREE.Matrix4();
        matrix.makeTranslation(parseFloat(this.selections[0][0]), parseFloat(this.selections[0][1]), parseFloat(this.selections[0][2]));
        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat).transpose();
        if (this.mode == "Mode.Local" || this.mode == "Mode.LocalMid") m.premultiply(matrix);
        if (this.mode == "Mode.Global" || this.mode == "Mode.GlobalMid") m.multiply(matrix);
        shape.appearance.transformation = m.transpose().toArray();
    };
    translation.unapplyRule = function (shape) {
        var matrix = new THREE.Matrix4();
        matrix.makeTranslation(-parseFloat(this.selections[0][0]), -parseFloat(this.selections[0][1]), -parseFloat(this.selections[0][2]));
        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat).transpose();
        if (this.mode == "Mode.Local" || this.mode == "Mode.LocalMid") m.premultiply(matrix);
        if (this.mode == "Mode.Global" || this.mode == "Mode.GlobalMid") m.multiply(matrix);
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
    translation.onHandlePressed = function (id, mouse, intersection, scene, camera, shape) {
        var arrowPos = scene.getObjectById(id).parent.position;
        var initStart = arrowPos.clone();
        var initEnd = intersection.clone();
        var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
        var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
        this.draggingHelpers.segment = {
            start: start,
            end: end
        };
        this.draggingHelpers.shape = shape;
        var inputFieldController = getInputFieldController();
        var values = inputFieldController.getNumberValue(this.fieldIds[0]);
        this.draggingHelpers.startValues.x = values[0];
        this.draggingHelpers.startValues.y = values[1];
        this.draggingHelpers.startValues.z = values[2];
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
        var newValues = [this.draggingHelpers.startValues.x,
            this.draggingHelpers.startValues.y,
            this.draggingHelpers.startValues.z];
        switch (this.draggingHelpers.activeHandle) {
            case 'x':
                newValues[0] = (this.draggingHelpers.startValues.x + length).round();
                break;
            case 'y':
                newValues[1] = (this.draggingHelpers.startValues.y + length).round();
                break;
            case 'z':
                newValues[2] = (this.draggingHelpers.startValues.z + length).round();
                break;
        }
        var inputFieldController = getInputFieldController();
        inputFieldController.setValue(this.fieldIds[0], newValues);
        inputChanged();
    };
    translation.onHandleReleased = function () {
        oldHandle = this.draggingHelpers.activeHandle;
        this.draggingHelpers.activeHandle = null;
        if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
    };
    return translation;
};

getRuleController().addRuleFactory(translateConfig.type, generatethisRule);