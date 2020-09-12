"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SimpleASCII = exports.Report = exports.Group = exports.Item = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Item {
  constructor(report, description) {
    _defineProperty(this, "columns", void 0);

    _defineProperty(this, "description", void 0);

    _defineProperty(this, "isInitialized", void 0);

    let nrColumns = report instanceof Report ? report.columns.length : report.length;
    this.columns = Report.createColumns(nrColumns);
    this.description = description;
    this.isInitialized = false;
  }

}

exports.Item = Item;

class Group extends Item {
  constructor(report, description) {
    super(report, description);

    _defineProperty(this, "averages", void 0);

    _defineProperty(this, "itemCount", void 0);

    _defineProperty(this, "items", void 0);

    _defineProperty(this, "min", void 0);

    _defineProperty(this, "max", void 0);

    _defineProperty(this, "percentages", void 0);

    let nrColumns = report instanceof Report ? report.columns.length : report.length;
    this.averages = Report.createColumns(nrColumns);
    this.itemCount = 0;
    this.items = [];
    this.min = Report.createColumns(nrColumns, Group.fakeMinumum);
    this.max = Report.createColumns(nrColumns);
    this.percentages = Report.createColumns(nrColumns);
  }

  addItem(report, item) {
    this.itemCount++;
    this.items.push(item);
    report.update(item, this);
    report.addItem(item);
  }

}

exports.Group = Group;

_defineProperty(Group, "fakeMinumum", 123456789);

class Report extends Group {
  constructor(columnHeaders) {
    super(columnHeaders, "");

    _defineProperty(this, "columnHeaders", void 0);

    _defineProperty(this, "groups", void 0);

    this.columnHeaders = columnHeaders;
    this.groups = [];
  }

  static createColumns(nrColumns, initialValue = 0) {
    let retVal = [];

    for (let i = 0; i < nrColumns; i++) {
      retVal.push(initialValue);
    }

    return retVal;
  }

  update(item, registrar) {
    let colTotal = registrar.columns.length - 1;
    let sum = 0;

    for (let col = 0; col < colTotal; col++) {
      let val = item.columns[col];
      sum += val;
      registrar.columns[col] += val;
      registrar.columns[colTotal] += val;

      if (registrar.min[col] == Group.fakeMinumum) {
        registrar.min[col] = val;
      } else {
        registrar.min[col] = Math.min(registrar.min[col], val);
      }

      registrar.max[col] = Math.max(registrar.max[col], val);
    }

    if (!item.isInitialized) {
      item.columns[colTotal] = sum;
      item.isInitialized = true;
    }

    for (let col = 0; col < colTotal; col++) {
      let ratio = 0;
      let total = registrar.columns[colTotal];

      if (registrar.columns[col] == 0 || total == 0) {
        registrar.percentages[col] = 0;
      } else {
        ratio = registrar.columns[col] / total;
        registrar.percentages[col] = ratio * 100;
      }

      registrar.averages[col] = registrar.columns[col] / registrar.itemCount;
    }

    registrar.percentages[colTotal] = 100;
    registrar.averages[colTotal] = registrar.columns[colTotal] / registrar.itemCount;

    if (registrar.min[colTotal] == Group.fakeMinumum) {
      registrar.min[colTotal] = item.columns[colTotal];
    } else {
      registrar.min[colTotal] = Math.min(registrar.min[colTotal], item.columns[colTotal]);
    }

    registrar.max[colTotal] = Math.max(registrar.max[colTotal], item.columns[colTotal]);
  }

  addGroup(group) {
    if (group.itemCount == 0) return;

    if (this.isInitialized != undefined) {
      delete this.isInitialized;
    }

    this.groups.push(group);
  }

  addItem(item) {
    this.update(item, this);
    this.itemCount++;
  }

}

exports.Report = Report;

class SimpleASCII {
  constructor(captions, columns, columnSeparator, rowSeparator) {
    _defineProperty(this, "captions", void 0);

    _defineProperty(this, "columns", void 0);

    _defineProperty(this, "columnSeparator", void 0);

    _defineProperty(this, "rowSeparator", void 0);

    _defineProperty(this, "isFirst", void 0);

    this.captions = captions;
    this.columns = columns;
    this.columnSeparator = columnSeparator;
    this.rowSeparator = rowSeparator;
    this.isFirst = true;
  }

  getLine(columns) {
    let retVal = "";

    if (this.isFirst) {
      let rowLine = "";

      for (let i = 0; i < this.columns.length; i++) {
        rowLine += "".padEnd(this.columns[i], this.rowSeparator);
      }

      rowLine += "\n";
      retVal = rowLine;

      for (let i = 0; i < this.columns.length; i++) {
        retVal += this.captions[i].padEnd(this.columns[i], " ");
      }

      retVal += "\n" + rowLine;
      this.isFirst = false;
    }

    for (let i = 0; i < columns.length; i++) {
      retVal += columns[i].padEnd(this.columns[i], " ");
    }

    return retVal;
  }

}

exports.SimpleASCII = SimpleASCII;