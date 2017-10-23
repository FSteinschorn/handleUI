attributeConfig = {
    type: 'Attribute',
    mode: false,
    options: [
        {
            label: 'Name',
            inputType: INPUTTYPE.STRING,
            values: null
        },
        {
            label: 'Value',
            inputType: INPUTTYPE.RAW,
            values: null
        }
    ]
};

generateAttributeConfig = function () {
    return generateCustomRule(self.attributeConfig);
};

getRuleController().addRuleFactory(attributeConfig.type, generateAttributeConfig);