growConfig = {
    type: 'Grow',
    mode: true,
    options: [
        {
            label: 'Vector',
            inputType: INPUTTYPE.VEC3,
            values: [0, 0, 0]
        }
    ]
};

generateGrowRule = function () {

    var grow = generateCustomRule(self.growConfig);

    grow.applyRule = function (shape) {
        var transform = shape.appearance.transformation;
        var sizeX = new THREE.Vector3(transform[0], transform[1], transform[2]).length();
        var sizeY = new THREE.Vector3(transform[4], transform[5], transform[6]).length();
        var sizeZ = new THREE.Vector3(transform[8], transform[9], transform[10]).length();
        var scaleX = (sizeX + parseFloat(grow.selections[0][0])) / sizeX;
        var scaleY = (sizeY + parseFloat(grow.selections[0][1])) / sizeY;
        var scaleZ = (sizeZ + parseFloat(grow.selections[0][2])) / sizeZ;

        var matrix = new THREE.Matrix4();
        matrix.makeScale(scaleX, scaleY, scaleZ);
        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat).transpose();
        if (grow.mode == "Mode.Local") {
            var translation = new THREE.Matrix4().makeTranslation(
                sizeX * (scaleX - 1) / 2,
                sizeY * (scaleY - 1) / 2,
                sizeZ * (scaleZ - 1) / 2
            );
            m.multiply(translation);
            m.multiply(matrix);
        } else if (grow.mode == "Mode.LocalMid") {
            m.multiply(matrix);
        } else if (grow.mode == "Mode.Global") {
            m.premultiply(matrix);
        } else if (grow.mode == "Mode.GlobalMid") {
            m.multiply(matrix);
        }
        shape.appearance.transformation = m.transpose().toArray();
    };
    grow.unapplyRule = function (shape) {
        var transform = shape.appearance.transformation;
        var sizeX = new THREE.Vector3(transform[0], transform[1], transform[2]).length();
        var sizeY = new THREE.Vector3(transform[4], transform[5], transform[6]).length();
        var sizeZ = new THREE.Vector3(transform[8], transform[9], transform[10]).length();
        var scaleX = sizeX / (sizeX - parseFloat(grow.selections[0][0]));
        var scaleY = sizeY / (sizeY - parseFloat(grow.selections[0][1]));
        var scaleZ = sizeZ / (sizeZ - parseFloat(grow.selections[0][2]));

        var matrix = new THREE.Matrix4();
        matrix.makeScale(1 / scaleX, 1 / scaleY, 1 / scaleZ);
        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat).transpose();
        if (grow.mode == "Mode.Local") {
            var translation = new THREE.Matrix4().makeTranslation(
                -(sizeX / 2) + (sizeX / scaleX / 2),
                -(sizeY / 2) + (sizeY / scaleY / 2),
                -(sizeZ / 2) + (sizeZ / scaleZ / 2)
            );
            m.multiply(matrix);
            m.multiply(translation);
        } else if (grow.mode == "Mode.LocalMid") {
            m.multiply(matrix);
        } else if (grow.mode == "Mode.Global") {
            m.premultiply(matrix);
        } else if (grow.mode == "Mode.GlobalMid") {
            m.multiply(matrix);
        }
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
        grow.draggingHelpers.scene = scene;

        var colors = [0xAA0000, 0x00AA00, 0x0000AA];
        var toSwitch = null;
        if (grow.draggingHelpers.activeHandle) toSwitch = grow.draggingHelpers.activeHandle;
        else if (grow.draggingHelpers.overHandle) toSwitch = grow.draggingHelpers.overHandle;
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
        grow.draggingHelpers.sizeX = xDir.length();
        grow.draggingHelpers.sizeY = yDir.length();
        grow.draggingHelpers.sizeZ = zDir.length();

        var ids = buildStandardAxes(scene, shape, colors);
        grow.draggingHelpers.ids.x = ids[0];
        grow.draggingHelpers.ids.y = ids[1];
        grow.draggingHelpers.ids.z = ids[2];
    };
    grow.onMouseOverHandle = function (id) {
        oldHandle = grow.draggingHelpers.overHandle;
        if (grow.draggingHelpers.ids.x <= id && id <= grow.draggingHelpers.ids.x + 2) {
            grow.draggingHelpers.overHandle = 'x';
        }
        if (grow.draggingHelpers.ids.y <= id && id <= grow.draggingHelpers.ids.y + 2) {
            grow.draggingHelpers.overHandle = 'y';
        }
        if (grow.draggingHelpers.ids.z <= id && id <= grow.draggingHelpers.ids.z + 2) {
            grow.draggingHelpers.overHandle = 'z';
        }
        if (grow.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    grow.onMouseNotOverHandle = function () {
        oldHandle = grow.draggingHelpers.overHandle;
        grow.draggingHelpers.overHandle = null;
        if (grow.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    grow.onHandlePressed = function (id, mouse, intersection, scene, camera) {
        var arrowPos = scene.getObjectById(id).parent.position;
        var initStart = arrowPos.clone();
        var initEnd = intersection.clone();
        var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
        var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
        grow.draggingHelpers.segment = {
            start: start,
            end: end
        }

        grow.draggingHelpers.startValues.x = parseFloat(document.getElementById("vec3_0_elem0").value);
        grow.draggingHelpers.startValues.y = parseFloat(document.getElementById("vec3_0_elem1").value);
        grow.draggingHelpers.startValues.z = parseFloat(document.getElementById("vec3_0_elem2").value);
        grow.draggingHelpers.cam = camera;
        grow.draggingHelpers.intersection = intersection;
        grow.draggingHelpers.arrowPos = arrowPos;

        grow.draggingHelpers.startSizeX = grow.draggingHelpers.sizeX;
        grow.draggingHelpers.startSizeY = grow.draggingHelpers.sizeY;
        grow.draggingHelpers.startSizeZ = grow.draggingHelpers.sizeZ;

        if (grow.draggingHelpers.ids.x <= id && id <= grow.draggingHelpers.ids.x + 2) {
            grow.draggingHelpers.activeHandle = 'x';
        }
        if (grow.draggingHelpers.ids.y <= id && id <= grow.draggingHelpers.ids.y + 2) {
            grow.draggingHelpers.activeHandle = 'y';
        }
        if (grow.draggingHelpers.ids.z <= id && id <= grow.draggingHelpers.ids.z + 2) {
            grow.draggingHelpers.activeHandle = 'z';
        }
    };
    grow.onHandleDragged = function (mouse) {
        var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
        mousePoint.unproject(grow.draggingHelpers.cam);
        var mouseRay = new THREE.Ray(grow.draggingHelpers.cam.position, mousePoint.sub(grow.draggingHelpers.cam.position).normalize());

        var targetPoint = new THREE.Vector3();
        mouseRay.distanceSqToSegment(grow.draggingHelpers.segment.start,
            grow.draggingHelpers.segment.end,
            null,
            targetPoint);

        var diff = targetPoint.sub(grow.draggingHelpers.intersection);
        var length = diff.length();
        var direction = grow.draggingHelpers.intersection.clone().sub(grow.draggingHelpers.arrowPos);
        var angle = diff.normalize().angleTo(direction.normalize());
        if (angle > (0.5 * Math.PI)) length *= -1;

        switch (this.draggingHelpers.activeHandle) {
            case 'x':
                var scale = grow.draggingHelpers.startSizeX + length;
                scale = scale / grow.draggingHelpers.startSizeX;
                var growFactor = scale * grow.draggingHelpers.sizeX - grow.draggingHelpers.sizeX;
                document.getElementById("vec3_0_elem0").value = (grow.draggingHelpers.startValues.x + length).round();
                break;
            case 'y':
                var scale = grow.draggingHelpers.startSizeY + length;
                scale = scale / grow.draggingHelpers.startSizeY;
                var growFactor = scale * grow.draggingHelpers.sizeY - grow.draggingHelpers.sizeY;
                document.getElementById("vec3_0_elem1").value = (grow.draggingHelpers.startValues.y + length).round();
                break;
            case 'z':
                var scale = grow.draggingHelpers.startSizeZ + length;
                scale = scale / grow.draggingHelpers.startSizeZ;
                var growFactor = scale * grow.draggingHelpers.sizeZ - grow.draggingHelpers.sizeZ;
                document.getElementById("vec3_0_elem2").value = (grow.draggingHelpers.startValues.z + length).round();
                break;
        }
        inputChanged();
    };
    grow.onHandleReleased = function () {
        oldHandle = grow.draggingHelpers.activeHandle;
        grow.draggingHelpers.activeHandle = null;
        if (grow.draggingHelpers.activeHandle != oldHandle) inputChanged();
    };

    return grow;
};

getRuleController().addRuleFactory(growConfig.type, generateGrowRule);