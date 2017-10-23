GoalConfig = {
    type: 'Goal',
    mode: false,
    options: [
        {
            label: 'Goal',
            inputType: INPUTTYPE.TAGS,
            values: null
        }
    ]
};

generateGoalRule = function () {
    return generateCustomRule(self.GoalConfig);
};

getRuleController().addRuleFactory(GoalConfig.type, generateGoalRule);
