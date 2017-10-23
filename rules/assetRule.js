var primitives = ["Primitive.Arch", "Primitive.Box", "Primitive.Circle", "Primitive.Cone",
        "Primitive.Cylinder", "Primitive.Dodecahedron", "Primitive.Icosahedron", "Primitive.Octahedron",
        "Primitive.Plane", "Primitive.Prism", "Primitive.Gable", "Primitive.Ring",
        "Primitive.Sphere", "Primitive.Tetrahedron", "Primitive.Torus", "Primitive.TorusKnot"];

assetConfig = {
    type: 'Asset',
    mode: false,
    options: [
        {
            label: 'Primitive',
            inputType: INPUTTYPE.DROPDOWN,
            values: primitives
        }
    ]
};

generateAssetRule = function () {
    return generateCustomRule(self.assetConfig);
};

getRuleController().addRuleFactory(assetConfig.type, generateAssetRule);