var axes = ["Axis.X", "Axis.Y", "Axis.Z"];
sizeConfig = {
    type: 'Size',
    mode: true,
    options: [
        {
            label: 'Axis',
            inputType: INPUTTYPE.DROPDOWN,
            values: axes
        },
        {
            label: 'Size',
            inputType: INPUTTYPE.DOUBLE,
            values: null
        }
    ]
};

generateSizeRule = function () {

    var sizeRule = generateCustomRule(self.sizeConfig);

    sizeRule.initialSize = null;

    sizeRule.applyRule = function (shape) {
        var matrix = new THREE.Matrix4();
        var translation = new THREE.Matrix4();

        var scale = this.selections[1] / this.initialSize || 1;
        switch (this.selections[0]) {
            case 'Axis.X':
                matrix.makeScale(scale, 1, 1);
                translation.makeTranslation(this.initialSize * (scale - 1) / 2, 0, 0);
                break;
            case 'Axis.Y':
                matrix.makeScale(1, scale, 1);
                translation.makeTranslation(0, this.initialSize * (scale - 1) / 2, 0);
                break;
            case 'Axis.Z':
                matrix.makeScale(1, 1, scale);
                translation.makeTranslation(0, 0, this.initialSize * (scale - 1) / 2);
                break;
            default:
                break;
        }

        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat).transpose();
        if (scale.mode == "Mode.Local") {
            m.multiply(translation);
            m.multiply(matrix);
        } else if (scale.mode == "Mode.LocalMid") {
            m.multiply(matrix);
        } else if (scale.mode == "Mode.Global") {
            m.premultiply(matrix);
        } else if (scale.mode == "Mode.GlobalMid") {
            m.multiply(matrix);
        }
        shape.appearance.transformation = m.transpose().toArray();
    };
    sizeRule.unapplyRule = function (shape) {
        var matrix = new THREE.Matrix4();
        var translation = new THREE.Matrix4();

        var scale = this.initialSize / this.selections[1] || 1;
        switch (this.selections[0]) {
            case 'Axis.X':
                matrix.makeScale(scale, 1, 1);
                translation.makeTranslation(
                    -(this.selections[1] / 2) + (this.selections[1] * scale / 2),
                    0, 0);
                break;
            case 'Axis.Y':
                matrix.makeScale(1, scale, 1);
                translation.makeTranslation(
                    0,
                    -(this.selections[1] / 2) + (this.selections[1] * scale / 2),
                    0);
                break;
            case 'Axis.Z':
                matrix.makeScale(1, 1, scale);
                translation.makeTranslation(
                    0, 0,
                    -(this.selections[1] / 2) + (this.selections[1] * scale / 2));
                break;
            default:
                break;
        }

        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat).transpose();
        if (scale.mode == "Mode.Local") {
            m.multiply(matrix);
            m.multiply(translation);
        } else if (scale.mode == "Mode.LocalMid") {
            m.multiply(matrix);
        } else if (scale.mode == "Mode.Global") {
            m.premultiply(matrix);
        } else if (scale.mode == "Mode.GlobalMid") {
            m.multiply(matrix);
        }
        shape.appearance.transformation = m.transpose().toArray();
    };
    sizeRule.createHandles = function (scene, shape) {

        // necessary calculations
        var m = shape.shape.appearance.transformation;
        var selector = document.getElementById('dropdown0');
        var selection = selector[selector.selectedIndex].label;

        if (!this.initialSizeX) {
            var dir = new THREE.Vector3(m[0], m[1], m[2]);
            this.initialSizeX = dir.length();
        }
        if (!this.initialSizeY) {
            var dir = new THREE.Vector3(m[4], m[5], m[6]);
            this.initialSizeY = dir.length();
        }
        if (!this.initialSizeZ) {
            var dir = new THREE.Vector3(m[8], m[9], m[10]);
            this.initialSizeZ = dir.length();
        }

        if (!this.initialSize) {
            if (this.selections[0] == 'Axis.X') {
                this.initialSize = this.initialSizeX;
            } else if (this.selections[0] == 'Axis.Y') {
                this.initialSize = this.initialSizeY;
            } else {
                this.initialSize = this.initialSizeZ;
            }
        }

        if (!this.selections[1]) this.selections[1] = this.initialSize;

        //create handles
        var basicColors = [0xAA3030, 0x30AA30, 0x3030AA];
        var highlightColors = [0xFF0000, 0x00FF00, 0x0000FF];

        mat = shape.shape.appearance.transformation;
        var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        center = new THREE.Vector3(0, 0, 0);
        center.applyProjection(m);

        var dir, length;
        switch (this.selections[0]) {
            case 'Axis.X':
                dir = new THREE.Vector3(1.0, 0, 0);
                length = new THREE.Vector3(this.selections[1], 0, 0);
                break;
            case 'Axis.Y':
                dir = new THREE.Vector3(0, 1.0, 0);
                length = new THREE.Vector3(0, this.selections[1], 0);
                break;
            case 'Axis.Z':
                dir = new THREE.Vector3(0, 0, 1.0);
                length = new THREE.Vector3(0, 0, this.selections[1]);
                break;
            default:
                break;
        }

        center.addScaledVector(length, 0.5);
        dir.applyProjection(m);
        dir.sub(center);
        dir.normalize();

        if (!this.draggingHelpers.arrowIds) this.draggingHelpers.arrowIds = [];
        this.draggingHelpers.highlight = (this.draggingHelpers.overHandle || this.draggingHelpers.activeHandle);

        var oldStartingId = this.draggingHelpers.arrowIds[0] || 0;
        this.draggingHelpers.arrowIds = [];
        switch (this.selections[0]) {
            case 'Axis.X':
                if (this.draggingHelpers.highlight) color = highlightColors[0];
                else color = basicColors[0];
                break;
            case 'Axis.Y':
                if (this.draggingHelpers.highlight) color = highlightColors[1];
                else color = basicColors[1];
                break;
            case 'Axis.Z':
                if (this.draggingHelpers.highlight) color = highlightColors[2];
                else color = basicColors[2];
                break;
            default:
                break;
        }

        var backarrow = new THREE.ArrowHelper(new THREE.Vector3().sub(dir), center, 0.5, color, 0.2, 0.1);
        var arrow = new THREE.ArrowHelper(dir, center, 0.5, color, 0.2, 0.1);
        scene.add(arrow);
        scene.add(backarrow);
        this.draggingHelpers.arrowIds.push(arrow.id);
        this.draggingHelpers.arrowIds.push(backarrow.id);

        this.draggingHelpers.idOffset = this.draggingHelpers.arrowIds[0] - oldStartingId;

        var input = document.getElementById('input_field1');
        if (!input.value) input.value = this.selections[1].round();
    };
    sizeRule.onMouseOverHandle = function (id) {
        oldHandle = this.draggingHelpers.overHandle;
        this.draggingHelpers.overHandle = true;
        if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    sizeRule.onMouseNotOverHandle = function () {
        oldHandle = this.draggingHelpers.overHandle;
        this.draggingHelpers.overHandle = null;
        if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    sizeRule.onHandlePressed = function (id, mouse, intersection, scene, camera) {
        var arrowPos = scene.getObjectById(id).parent.position;
        var initStart = arrowPos.clone();
        var initEnd = intersection.clone();
        var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
        var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
        this.draggingHelpers.segment = {
            start: start,
            end: end
        }

        this.draggingHelpers.startValue = parseFloat(document.getElementById("input_field1").value);
        this.draggingHelpers.cam = camera;
        this.draggingHelpers.intersection = intersection;
        this.draggingHelpers.arrowPos = arrowPos;

        this.draggingHelpers.startSize = this.draggingHelpers.size;

        this.draggingHelpers.activeHandle = true;
    };
    sizeRule.onHandleDragged = function (mouse) {
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

        document.getElementById("input_field1").value = (this.draggingHelpers.startValue + length).round();

        inputChanged();
    };
    sizeRule.onHandleReleased = function () {
        oldHandle = this.draggingHelpers.activeHandle;
        this.draggingHelpers.activeHandle = null;
        if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
    };
    sizeRule.additionalUpdates = function () {
        switch (this.selections[0]) {
            case 'Axis.X':
                this.initialSize = this.initialSizeX;
                break;
            case 'Axis.Y':
                this.initialSize = this.initialSizeY;
                break;
            case 'Axis.Z':
                this.initialSize = this.initialSizeZ;
                break;
            default:
                break;
        }
    };

    return sizeRule;
};

getRuleController().addRuleFactory(sizeConfig.type, generateSizeRule);