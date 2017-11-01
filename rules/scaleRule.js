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

    var scale = generateCustomRule(self.scaleConfig);

    scale.applyRule = function (shape) {
        var matrix = new THREE.Matrix4();
        matrix.makeScale(parseFloat(scale.selections[0][0]), parseFloat(scale.selections[0][1]), parseFloat(scale.selections[0][2]));
        var m = shape.appearance.transformation;
        var mat = new THREE.Matrix4().fromArray(m).transpose();
        if (scale.mode == "Mode.Local") {
            var xSize = new THREE.Vector3(m[0], m[1], m[2]).length();
            var ySize = new THREE.Vector3(m[4], m[5], m[6]).length();
            var zSize = new THREE.Vector3(m[8], m[9], m[10]).length();
            var translation = new THREE.Matrix4().makeTranslation(
                xSize * (scale.selections[0][0] - 1) / 2,
                ySize * (scale.selections[0][1] - 1) / 2,
                zSize * (scale.selections[0][2] - 1) / 2
            );
            mat.multiply(translation);
            mat.multiply(matrix);
        } else if (scale.mode == "Mode.LocalMid") {
            mat.multiply(matrix);
        } else if (scale.mode == "Mode.Global") {
            mat.premultiply(matrix);
        } else if (scale.mode == "Mode.GlobalMid") {
            mat.multiply(matrix);
        }
        shape.appearance.transformation = mat.transpose().toArray();
    };
    scale.unapplyRule = function (shape) {
        var matrix = new THREE.Matrix4();
        matrix.makeScale(1 / parseFloat(scale.selections[0][0]), 1 / parseFloat(scale.selections[0][1]), 1 / parseFloat(scale.selections[0][2]));
        var m = shape.appearance.transformation;
        var mat = new THREE.Matrix4().fromArray(m).transpose();
        if (scale.mode == "Mode.Local") {
            var xSize = new THREE.Vector3(m[0], m[1], m[2]).length();
            var ySize = new THREE.Vector3(m[4], m[5], m[6]).length();
            var zSize = new THREE.Vector3(m[8], m[9], m[10]).length();
            var translation = new THREE.Matrix4().makeTranslation(
                -(xSize / 2) + (xSize / scale.selections[0][0] / 2),
                -(ySize / 2) + (ySize / scale.selections[0][1] / 2),
                -(zSize / 2) + (zSize / scale.selections[0][2] / 2)
            );
            mat.multiply(matrix);
            mat.multiply(translation);
        } else if (scale.mode == "Mode.LocalMid") {
            mat.multiply(matrix);
        } else if (scale.mode == "Mode.Global") {
            mat.premultiply(matrix);
        } else if (scale.mode == "Mode.GlobalMid") {
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
};

getRuleController().addRuleFactory(scaleConfig.type, generateScaleRule);