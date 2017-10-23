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

generateTranslationRule = function () {
    var translation = generateCustomRule(translateConfig);
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
};

getRuleController().addRuleFactory(translateConfig.type, generateTranslationRule);