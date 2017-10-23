var colors = ["Color.Ambient", "Color.Diffuse", "Color.Emmisive", "Color.AmbientAndDiffuse", "Color.Specular"];
hueConfig = {
    type: 'Hue',
    mode: true,
    options: [
        {
            label: 'Color Type',
            inputType: INPUTTYPE.DROPDOWN,
            values: colors
        },
        {
            label: 'Value',
            inputType: INPUTTYPE.DOUBLE,
            values: null
        }
    ]
};

generateHueRule = function () {
    return generateCustomRule(self.hueConfig);
};

getRuleController().addRuleFactory(hueConfig.type, generateHueRule);