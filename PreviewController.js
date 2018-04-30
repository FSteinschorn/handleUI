
var previewController;

function getPreviewController() {
    if (!previewController) previewController = new PreviewController();
    return previewController;
}

function PreviewController() {

    var self = {};

    self.previewScene = new THREE.Scene();

    self.shapes = new Map();

    self.storeShape = function(shape) {
        if (!shape.previewID) {
            shape.previewID = makeid();
            shape.nrAppliedRules = 0;
            if (!shape.appliedRules)
                shape.appliedRules = [];
            this.shapes[shape.previewID] = shape;
        }
    };

    self.forgetShape = function(shape) {
        delete this.shapes[shape.previewID];
        shape.previewID = null;
    };

    self.getShape = function(previewID) {
        return this.shapes[previewID];
    };

    self.addPreview = function(shape) {
        this.storeShape(shape);
        shape.nrAppliedRules += 1;
    };

    self.removePreview = function(shape) {
        shape.nrAppliedRules -= 1;
        this.shapes[shape.previewID] = shape;
    };

    self.preparePreview = function(selectedMesh) {

        for (var i = this.previewScene.children.length - 1; i >= 0; --i)
            this.previewScene.remove(this.previewScene.children[i]);

        for (var id in this.shapes) {
            var shape = this.shapes[id];
            if (shape.appliedRules.length <= 0 && (!selectedMesh || shape != selectedMesh)) continue;
            if (shape.childShapes && shape.childShapes.length != 0) continue;

            var color = 0x0099ff;
            if (selectedMesh && shape == selectedMesh) color = 0x44ff3b;

            var geo;
            var t = shape.appearance.transformation;
            var matrix = new THREE.Matrix4().set(t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9], t[10], t[11], t[12], t[13], t[14], t[15]);
            var positiveDeterminant = matrix.determinant() > 0.0;
            var visible = true;
            if (shape.appearance.primitive) {
                geo = GeometricPrimitives.Get(shape.appearance.primitive, positiveDeterminant);
                visible = shape.appearance.primitive !== 'Empty';
            }
            else {
                geo = new THREE.Geometry();
                var vertices = shape.appearance.geometry.points;
                for (var i = 2; i < vertices.length; i += 3) {
                    geo.vertices.push(new THREE.Vector3(vertices[i - 2], vertices[i - 1], vertices[i]));
                }
                if (shape.appearance.geometry.indexed) {
                    var indices = shape.appearance.geometry.indices;
                    for (var i = 2; i < indices.length; i += 3)
                        geo.faces.push(new THREE.Face3(indices[i - (positiveDeterminant ? 2 : 1)], indices[i - (positiveDeterminant ? 1 : 2)], indices[i]));
                }
                else {
                    for (var i = 2, j = 8; j < vertices.length; i += 3, j += 9)
                        geo.faces.push(new THREE.Face3(i - (positiveDeterminant ? 2 : 1), i - (positiveDeterminant ? 1 : 2), i));
                }
                geo.computeFaceNormals();
                if (!positiveDeterminant) {
                    for (var i = 0; i < geo.faces.length; ++i)
                        geo.faces[i].normal.multiplyScalar(-1.0);
                }
            }
            var wireFrameMaterial = new THREE.MeshBasicMaterial({
                color: color,
                wireframe: true
            });
            var mesh = new THREE.Mesh(geo, wireFrameMaterial);
            mesh.matrixAutoUpdate = false;
            mesh.applyMatrix(matrix);
            mesh.previewID = shape.previewID;
            mesh.mName = shape.id;
            mesh.mMaterial = wireFrameMaterial;
            mesh.visible = visible;
            self.previewScene.add(mesh);
        }
    };

    self.removeAll = function() {
        for (var i = this.previewScene.children.length - 1; i >= 0; --i)
            this.previewScene.remove(this.previewScene.children[i]);

        this.shapes = new Map();
    };

    return self;

}