goalConfig = {
    type: 'goal',
    mode: false,
    options: [
        {
            label: 'goal',
            inputType: INPUTTYPE.TAGS,
            values: null
        }
    ]
};

generategoalRule = function () {
    return generateCustomRule(self.goalConfig);
};

getRuleController().addRuleFactory(goalConfig.type, generategoalRule);