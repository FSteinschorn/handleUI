saturationConfig = {
    type: 'Saturate',
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

generateSaturationRule = function () {
    return generateCustomRule(self.saturationConfig);
};

getRuleController().addRuleFactory(saturationConfig.type, generateSaturationRule);