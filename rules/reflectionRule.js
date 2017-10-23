var axes = ["Axis.X", "Axis.Y", "Axis.Z"];
reflectionConfig = {
    type: 'Reflect',
    mode: true,
    options: [
        {
            label: 'Axis',
            inputType: INPUTTYPE.DROPDOWN,
            values: axes
        }
    ]
};

generateReflectionRule = function () {
    return generateCustomRule(self.reflectionConfig);
};

getRuleController().addRuleFactory(reflectionConfig.type, generateReflectionRule);