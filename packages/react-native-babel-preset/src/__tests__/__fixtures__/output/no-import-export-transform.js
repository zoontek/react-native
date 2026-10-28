/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated
 * @noformat
 * @noflow
 * @nolint
 *
 * This is a snapshot of the transform output for testing purposes.
 * To update, run: js1 test transform-snapshot-test.js -u
 *
 * Transform configuration:
 *   - With import/export transform disabled
 *   - Options: {"dev":false,"disableImportExportTransform":true}
 */

import _inherits from "@babel/runtime/helpers/inherits";
import _setPrototypeOf from "@babel/runtime/helpers/setPrototypeOf";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classPrivateFieldLooseBase from "@babel/runtime/helpers/classPrivateFieldLooseBase";
import _classPrivateFieldLooseKey from "@babel/runtime/helpers/classPrivateFieldLooseKey";
import _awaitAsyncGenerator from "@babel/runtime/helpers/awaitAsyncGenerator";
import _wrapAsyncGenerator from "@babel/runtime/helpers/wrapAsyncGenerator";
function _wrapRegExp() { _wrapRegExp = function (e, r) { return new BabelRegExp(e, void 0, r); }; var e = RegExp.prototype, r = new WeakMap(); function BabelRegExp(e, t, p) { var o = RegExp(e, t); return r.set(o, p || r.get(e)), _setPrototypeOf(o, BabelRegExp.prototype); } function buildGroups(e, t) { var p = r.get(t); return Object.keys(p).reduce(function (r, t) { var o = p[t]; if ("number" == typeof o) r[t] = e[o];else { for (var i = 0; void 0 === e[o[i]] && i + 1 < o.length;) i++; r[t] = e[o[i]]; } return r; }, Object.create(null)); } return _inherits(BabelRegExp, RegExp), BabelRegExp.prototype.exec = function (r) { var t = e.exec.call(this, r); if (t) { t.groups = buildGroups(t, this); var p = t.indices; p && (p.groups = buildGroups(p, this)); } return t; }, BabelRegExp.prototype[Symbol.replace] = function (t, p) { if ("string" == typeof p) { var o = r.get(this); return e[Symbol.replace].call(this, t, p.replace(/\$<([^>]+)(>|$)/g, function (e, r, t) { if ("" === t) return e; var p = o[r]; return Array.isArray(p) ? "$" + p.join("$") : "number" == typeof p ? "$" + p : ""; })); } if ("function" == typeof p) { var i = this; return e[Symbol.replace].call(this, t, function () { var e = arguments; return "object" != typeof e[e.length - 1] && (e = [].slice.call(e)).push(buildGroups(e, i)), p.apply(this, e); }); } return e[Symbol.replace].call(this, t, p); }, _wrapRegExp.apply(this, arguments); }
import * as React from 'react';
import { useEffect, useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
var _count = _classPrivateFieldLooseKey("count");
var _instances = _classPrivateFieldLooseKey("instances");
var _increment = _classPrivateFieldLooseKey("increment");
class Counter {
  constructor() {
    Object.defineProperty(this, _increment, {
      value: _increment2
    });
    Object.defineProperty(this, _count, {
      writable: true,
      value: 0
    });
    _classPrivateFieldLooseBase(Counter, _instances)[_instances]++;
  }
  get value() {
    return _classPrivateFieldLooseBase(this, _count)[_count];
  }
  increment() {
    _classPrivateFieldLooseBase(this, _increment)[_increment]();
  }
  static get instanceCount() {
    return _classPrivateFieldLooseBase(Counter, _instances)[_instances];
  }
}
function _increment2() {
  _classPrivateFieldLooseBase(this, _count)[_count]++;
}
Object.defineProperty(Counter, _instances, {
  writable: true,
  value: 0
});
function asyncNumberGenerator(_x) {
  return _asyncNumberGenerator.apply(this, arguments);
}
function _asyncNumberGenerator() {
  _asyncNumberGenerator = _wrapAsyncGenerator(function* (max) {
    for (var i = 0; i < max; i++) {
      yield _awaitAsyncGenerator(new Promise(resolve => setTimeout(resolve, 100)));
      yield i;
    }
  });
  return _asyncNumberGenerator.apply(this, arguments);
}
function fetchData(_x2) {
  return _fetchData.apply(this, arguments);
}
function _fetchData() {
  _fetchData = _asyncToGenerator(function* (url) {
    var response = yield fetch(url);
    var data = yield response.json();
    return {
      data
    };
  });
  return _fetchData.apply(this, arguments);
}
function getNestedValue(obj) {
  return obj?.a?.b?.c ?? 42;
}
class Animal {
  #age;
  constructor(name, age) {
    this.name = name;
    this.#age = age;
  }
  speak() {
    return `${this.name} makes a sound`;
  }
  get age() {
    return this.#age;
  }
}
class Dog extends Animal {
  constructor(name, age, breed) {
    super(name, age);
    this.breed = breed;
  }
  speak() {
    return `${this.name} barks!`;
  }
  fetchTreats() {
    return _asyncToGenerator(function* () {
      yield new Promise(resolve => setTimeout(resolve, 100));
      return ['bone', 'biscuit', 'toy'];
    })();
  }
}
function processUser({
  name,
  age = 18,
  ...rest
}) {
  var {
    city = 'Unknown'
  } = rest;
  return `${name} (${age}) from ${city}`;
}
function mergeConfigs(base, ...overrides) {
  return {
    ...base,
    ...overrides.reduce((acc, o) => ({
      ...acc,
      ...o
    }), {})
  };
}
function sumPairs(pairs) {
  var total = 0;
  for (var [a, b] of pairs) {
    total += a + b;
  }
  return total;
}
function parseDate(dateString) {
  var regex = _wrapRegExp(/(\d{4})-(\d{2})-(\d{2})/, {
    year: 1,
    month: 2,
    day: 3
  });
  var match = dateString.match(regex);
  if (match?.groups) {
    return {
      year: match.groups.year,
      month: match.groups.month,
      day: match.groups.day
    };
  }
  return null;
}
function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
function matchEmoji(text) {
  var match = text.match(/\p{Emoji}/u);
  return match?.[0];
}
var MyClass = class {
  constructor(value) {
    this.value = value;
  }
};
function loadModule() {
  return _loadModule.apply(this, arguments);
}
function _loadModule() {
  _loadModule = _asyncToGenerator(function* () {
    var module = yield import('./some-module');
    return module.default;
  });
  return _loadModule.apply(this, arguments);
}
var LegacyComponent = React.createClass({
  displayName: 'LegacyComponent',
  getInitialState() {
    return {
      count: 0
    };
  },
  render() {
    return _jsx("div", {
      children: this.state.count
    });
  }
});
function ModernComponent({
  initialCount = 0
}) {
  var [count, setCount] = useState(initialCount);
  var [status, setStatus] = useState(Status.Active);
  useEffect(() => {
    var timer = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  function handleAsyncClick() {
    return _handleAsyncClick.apply(this, arguments);
  }
  function _handleAsyncClick() {
    _handleAsyncClick = _asyncToGenerator(function* () {
      var data = yield fetchData('/api/data');
      console.log(data);
    });
    return _handleAsyncClick.apply(this, arguments);
  }
  var handleClick = function () {
    var _ref = _asyncToGenerator(function* () {
      yield handleAsyncClick();
      setStatus(Status.Pending);
    });
    return function handleClick() {
      return _ref.apply(this, arguments);
    };
  }();
  return _jsxs("div", {
    children: [_jsx("span", {
      "data-testid": "count",
      children: count
    }), _jsx("span", {
      "data-testid": "status",
      children: String(status)
    }), _jsx("button", {
      onClick: handleClick,
      children: "Increment"
    }), _jsx(LegacyComponent, {})]
  });
}
export { fetchData as default } from './data-utils';
export { Counter, Animal, Dog, asyncNumberGenerator, getNestedValue, processUser, mergeConfigs, sumPairs, parseDate, safeJsonParse, matchEmoji, MyClass, loadModule, ModernComponent, LegacyComponent };