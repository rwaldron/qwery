!function (context, doc) {

  function array(ar) {
    var i, len, r = [];
    for (i = 0, len = ar.length; i < len; i++) {
      r[i] = ar[i];
    }
    return r;
  }

  function getAllChildren(e) {
    return e.all ? e.all : e.getElementsByTagName('*');
  }

  function iter(obj) {
    this.obj = array(obj);
  }

  iter.prototype = {
    each: function (fn) {
      for (var i = 0; i  < this.obj.length; i ++) {
        fn.call(this.obj[i], this.obj[i], i, this.obj);
      }
      return this;
    },

    map: function (fn) {
      var collection = [];
      for (var i = 0; i  < this.obj.length; i ++) {
        collection[i] = fn.call(this.obj[i], this.obj[i], i, this.obj);
      }
      return collection;
    }
  };

  function _(obj) {
    return new iter(obj);
  }

  function getAttribute(e, attrName) {
    return e.getAttribute(attrName) || '';
  }

  var checkFunctions = {
    '=': function (e, attrName, attrValue) {
      return (e.getAttribute(attrName) == attrValue);
    },
    '~': function (e, attrName, attrValue) {
      return (getAttribute(e, attrName).match(new RegExp('\\b' + attrValue + '\\b')));
    },
    '|': function (e, attrName, attrValue) {
      return (getAttribute(e, attrName).match(new RegExp('^' + attrValue + '-?')));
    },
    '^': function (e, attrName, attrValue) {
      return (getAttribute(e, attrName).indexOf(attrValue) === 0);
    },
    '$': function (e, attrName, attrValue) {
      return (getAttribute(e, attrName).lastIndexOf(attrValue) == e.getAttribute(attrName).length - attrValue.length);
    },
    '*': function (e, attrName, attrValue) {
      return (getAttribute(e, attrName).indexOf(attrValue) > -1);
    },
    '': function (e, attrName) {
      return e.getAttribute(attrName);
    }
  };

  function isAncestor(child, parent) {
    if (!parent || !child || parent == child) {
      return false;
    }
    if (parent.contains && child.nodeType) {
      return parent.contains(child);
    }
    else if (parent.compareDocumentPosition && child.nodeType) {
      return !!(parent.compareDocumentPosition(child) & 16);
    }
    return false;
  }


  function _qwery(selector) {
    var tokens = selector.split(' '), bits, tagName, h, i, j, k, l, len,
      found, foundCount, elements, currentContextIndex, currentContext = [doc],
      attrName, attrOperator, attrValue, checkFunction;

    for (i = 0, l = tokens.length; i < l; i++) {
      token = tokens[i].replace(/^\s+|\s+$/g, '');

      if (token.indexOf('#') > -1) {
        bits = token.split('#');
        tagName = bits[0];
        var element = doc.getElementById(bits[1]);
        if (tagName && element.nodeName.toLowerCase() != tagName) {
          return [];
        }
        currentContext = [element];
        continue;
      }

      if (token.indexOf('.') > -1) {
        // Token contains a class selector
        bits = token.split('.');
        tagName = bits[foundCount = 0];
        tagName = tagName || '*';
        found = [];
        for (h = 0, len = currentContext.length; h < len; h++) {
          elements = tagName == '*' ? getAllChildren(currentContext[h]) : currentContext[h].getElementsByTagName(tagName);
          for (j = 0, k = elements.length; j < k; j++) {
            found[foundCount++] = elements[j];
          }
        }
        currentContext = [];
        currentContextIndex = 0;
        for (k = 0, len = found.length; k < len; k++) {
          if (found[k].className && found[k].className.match(new RegExp('(?:^|\\s+)' + bits[1] + '(?:\\s+|$)'))) {
            currentContext[currentContextIndex++] = found[k];
          }
        }
        continue;
      }
      // Code to deal with attribute selectors
      var match = token.match(/^(\w*)\[(\w+)([=~\|\^\$\*]?)=?"?([^\]"]*)"?\]$/);
      if (match) {
        tagName = match[1];
        attrName = match[2];
        attrOperator = match[3];
        attrValue = match[4];
        if (!tagName) {
          tagName = '*';
        }
        // Grab all of the tagName elements within current context
        found = [];
        foundCount = 0;
        for (h = 0; h < currentContext.length; h++) {
          if (tagName == '*') {
            elements = getAllChildren(currentContext[h]);
          } else {
            elements = currentContext[h].getElementsByTagName(tagName);
          }
          for (j = 0; j < elements.length; j++) {
            found[foundCount++] = elements[j];
          }
        }
        currentContext = [];
        currentContextIndex = 0;
        // This function will be used to filter the elements
        checkFunction = checkFunctions[attrOperator] || checkFunctions[''];
        for (k = 0; k < found.length; k++) {
          if (checkFunction(found[k], attrName, attrValue)) {
            currentContext[currentContextIndex++] = found[k];
          }
        }
        continue; // Skip to next token
      }
      // If we get here, token is JUST an element (not a class or ID selector)
      tagName = token;
      found = [];
      foundCount = 0;

      for (h = 0; h < currentContext.length; h++) {
        elements = currentContext[h].getElementsByTagName(tagName);
        for (j = 0; j < elements.length; j++) {
          found[foundCount++] = elements[j];
        }
      }
      currentContext = found;
    }
    return currentContext;
  }



  var qwery = function () {

    // exception for pure classname selectors (it's faster)
    var clas = /^\.([\w\-]+)$/, m;

    function qsa(selector, root) {
      root = (typeof root == 'string') ? document.querySelector(root) : root;
      // taking for granted that every browser that supports qsa, also supports getElsByClsName
      if (m = selector.match(clas)) {
        return array((root || document).getElementsByClassName(m[1]), 0);
      }
      return array((root || document).querySelectorAll(selector), 0);
    }

    // return fast
    if (document.querySelector && document.querySelectorAll) {
      return qsa;
    }

    return function (selector, root) {
      root = (typeof root == 'string') ? qwery(root)[0] : (root || document);
      // these next two operations could really benefit from an accumulator (eg: map/each/accumulate)
      var result = [];
      // here we allow combinator selectors: $('div,span');
      var collections = _(selector.split(',')).map(function (selector) {
        return _qwery(selector);
      });

      _(collections).each(function (collection) {
        var ret = collection;
        // allow contexts
        if (root !== document) {
          ret = [];
          _(collection).each(function (element) {
            // make sure element is a descendent of root
            isAncestor(element, root) && ret.push(element);
          });
        }

        result = result.concat(ret);
      });
      return result;
    };
  }();

  var oldQwery = context.qwery;

  // being nice
  qwery.noConflict = function () {
    context.qwery = oldQwery;
    return this;
  };
  context.qwery = qwery;

}(this, document);
