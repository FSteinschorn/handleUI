function TempRuleController() {
    var self = {};

    self.rules = new Map();
    self.shapes = new Map();

    self.previewScene = new THREE.Scene();

    self.addNewTranslation = function (shape, x, y, z, tags) {

        var rule = {
            type: "translation",
            x: x,
            y: y,
            z: z,
            tags: tags
        }

        rules.add(shape.id, rule);

        shape.appearance.transformation[3] += parseFloat(x);
        shape.appearance.transformation[7] += parseFloat(y);
        shape.appearance.transformation[11] += parseFloat(z);

        addPreview(shape);
        
        var editor = ace.edit("code_text_ace");
        editor.setValue(editor.getValue() + "\n\n" + "new Rules.Translate(Vec3(" + x + ", " + y + ", " + z + "));", 1);
        for (i = 0; i < tags.length; i++) {
            editor.setValue(editor.getValue() + "\n\t.Fulfills(\"" + tags[i] + "\");");
        }
    }

    self.addPreview = function (shape) {
        var id = shape.id;

        shapes.add(id, shape);

        var geo, matrix;
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
            color: 0x0099ff,
            wireframe: true
        });
        var mesh = new THREE.Mesh(geo, wireFrameMaterial);
        mesh.matrixAutoUpdate = false;
        mesh.applyMatrix(matrix);
        mesh.mName = id;
        mesh.mMaterial = wireFrameMaterial;
        mesh.visible = visible;
        self.previewScene.add(mesh);
    }

    return self;
}