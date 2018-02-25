
var inputFieldController;

function getInputFieldController() {
    if (!inputFieldController) inputFieldController = new InputFieldController();
    return inputFieldController;
}

function InputFieldController() {

    var self = {};

    self.inputFields = new Map();

    self.addInputField = function(parentDiv, label, types, defaults, updateCallback) {
        var field = InputField(parentDiv, label, types, defaults, updateCallback);
        self.inputFields[field.id] = field;

        return field.id;
    };

    self.removeInputField = function(id) {
        self.inputFields[id].remove();
        self.inputFields.delete(id);
    };

    self.setValue = function(id, value) {
        self.inputFields[id].setValue(value);
    };

    self.getNumberValue = function(id) {
        return self.inputFields[id].getNumberValue(id);
    };

    self.getStringValue = function(id) {
        return self.inputFields[id].getStringValue(id);
    };

    return self;
}