
var instance;

function getInputFieldController() {
    if (!instance) instance = new InputFieldController();
    return instance;
}

function InputFieldController() {

    var self = {};

    self.inputFields = new Map();

    self.addInputField = function(parentDiv, label, types, defaults, updateCallback) {
        [id, field] = InputField(parentDiv, label, types, defaults, updateCallback);
        self.inputFields[id] = field;

        return id;
    };

    self.setValue = function(id, value) {
        self.inputFields[id].setValue(value);
    };

    self.getNumberValue = function(id) {
        self.inputFields[id].getNumberValue(id);
    };

    self.getStringValue = function(id) {
        self.inputFields[id].getStringValue(id);
    };

    return self;
}