var util = require('util');

var ScenarioOutline = function (keyword, name, description, uri, line) {
  var Cucumber = require('../../cucumber');

  var examples;
  var self = Cucumber.Ast.Scenario(keyword, name, description, uri, line);

  self.payload_type = 'scenarioOutline';

  self.setExamples = function (newExamples) {
    examples = newExamples;
  };

  self.getExamples = function () {
    return examples;
  };

  self.applyExampleRow = function applyExampleRow(example, steps) {
    return steps.syncMap(function (outline) {
      var name = outline.getName(),
        table = Cucumber.Ast.DataTable(),
        rows = [],
        hasDocString = outline.hasDocString(),
        hasDataTable = outline.hasDataTable(),
        oldDocString = hasDocString ? outline.getDocString() : null,
        docString = hasDocString ? oldDocString.getContents() : null,
        hashKey;

      if (hasDataTable) {
        rows = [];
        outline.getDataTable().getRows().syncForEach(function(row) {
          rows.push({
            line:  row.getLine(),
            cells: JSON.stringify(row.raw())
          });
        });
      }

      for (hashKey in example) {
        if (Object.prototype.hasOwnProperty.call(example, hashKey)) {
          name = name.replace('<' + hashKey + '>', example[hashKey]);
          if (hasDataTable) {
            rows = rows.map(function(row) {
              return {
                line: row.line,
                cells: row.cells.replace('<' + hashKey + '>', example[hashKey])
              };
            });
          }
          if (hasDocString) {
            docString = docString.replace('<' + hashKey + '>', example[hashKey]);
          }
        }
      }

      var step = Cucumber.Ast.Step(outline.getKeyword(), name, examples.getUri(), outline.getLine());
      if (hasDataTable) {
        rows.forEach(function(row){
          table.attachRow( Cucumber.Ast.DataTable.Row( JSON.parse(row.cells), row.line) );
        });
        step.attachDataTable(table);
      }
      if (hasDocString) {
        step.attachDocString( Cucumber.Ast.DocString(oldDocString.getContentType(), docString, oldDocString.getLine()));
      }
      return step;
    });
  };

  self.acceptVisitor = function acceptVisitor(visitor, callback) {
    var rows     = examples.getDataTable().getRows();
    var firstRow = rows.shift().raw();

    rows.syncForEach(function(row, index) {
      var length = firstRow.length,
        i;
      row.example = {};
      row.id = index.toString();
      for (i = 0; i < length; i++){
        row.example[firstRow[i]] = row.raw()[i];
      }
    });

    rows.forEach(function (row, iterate) {
      self.instructVisitorToVisitRowSteps(visitor, row, iterate);
    }, callback);
  };

  self.instructVisitorToVisitRowSteps = function instructVisitorToVisitRowSteps(visitor, row, callback) {
    visitor.visitRow(row, self, callback);
  };

  self.visitRowSteps = function visitRowSteps(visitor, row, callback) {
    self.instructVisitorToVisitBackgroundSteps(visitor, function () {
      var newSteps = self.applyExampleRow(row.example, self.getSteps());
      self.instructVisitorToVisitSteps(visitor, newSteps, callback);
    });
  };

  return self;
};
module.exports = ScenarioOutline;

