(function () {
  var storageKey = "portfolio-inline-edits-v4";
  var legacyStorageKey = "portfolio-inline-edits-v1";
  var editToggle = document.getElementById("editToggle");
  var saveButton = document.getElementById("saveEdits");
  var exportButton = document.getElementById("exportHtml");
  var duplicateButton = document.getElementById("duplicateBox");
  var deleteBoxButton = document.getElementById("deleteBox");
  var deleteSectionButton = document.getElementById("deleteSection");
  var addLinkButton = document.getElementById("addLink");
  var resetButton = document.getElementById("resetEdits");
  var resetStyleButton = document.getElementById("resetStyle");
  var status = document.getElementById("editStatus");
  var editables = Array.prototype.slice.call(document.querySelectorAll("[data-editable]"));
  var movables = Array.prototype.slice.call(document.querySelectorAll("[data-movable]"));
  var editing = false;
  var selectedElement = null;
  var resizeHandle = document.createElement("button");
  var moveHandle = document.createElement("button");
  var isResizing = false;
  var isMoving = false;
  var resizeStart = null;
  var moveStart = null;

  var controls = {
    fontFamily: document.getElementById("fontFamilyControl"),
    fontSize: document.getElementById("fontSizeControl"),
    lineHeight: document.getElementById("lineHeightControl"),
    width: document.getElementById("widthControl"),
    height: document.getElementById("heightControl"),
    padding: document.getElementById("paddingControl"),
    textAlign: document.getElementById("textAlignControl"),
    color: document.getElementById("textColorControl"),
    backgroundColor: document.getElementById("backgroundColorControl")
  };

  var styleProperties = [
    "fontFamily",
    "fontSize",
    "lineHeight",
    "width",
    "height",
    "padding",
    "textAlign",
    "color",
    "backgroundColor",
    "position",
    "left",
    "top"
  ];

  resizeHandle.type = "button";
  resizeHandle.className = "resize-handle is-hidden";
  resizeHandle.setAttribute("aria-label", "Resize selected element");
  document.body.appendChild(resizeHandle);
  moveHandle.type = "button";
  moveHandle.className = "move-handle is-hidden";
  moveHandle.setAttribute("aria-label", "Move selected element");
  document.body.appendChild(moveHandle);

  function setStatus(message) {
    status.textContent = message;
  }

  function refreshEditableLists() {
    editables = Array.prototype.slice.call(document.querySelectorAll("[data-editable]"));
    movables = Array.prototype.slice.call(document.querySelectorAll("[data-movable]"));
  }

  function readStorage() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (error) {
      return {};
    }
  }

  function loadLegacyTextEdits() {
    var saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(legacyStorageKey) || "{}");
    } catch (error) {
      saved = {};
    }

    editables.forEach(function (element) {
      var key = element.getAttribute("data-editable");
      if (key === "brand-mark" || key === "brand-name") {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(saved, key)) {
        element.innerHTML = saved[key];
      }
    });
  }

  function applyStyle(element, styles) {
    styleProperties.forEach(function (property) {
      if (styles && styles[property]) {
        element.style[property] = styles[property];
      }
    });
  }

  function registerEditable(element) {
    if (editables.indexOf(element) === -1) {
      editables.push(element);
    }
    element.setAttribute("contenteditable", String(editing));
    element.setAttribute("spellcheck", "true");
    if (editing) {
      element.setAttribute("title", "Click and type to edit. Use the toolbar to change style.");
    }
  }

  function editableKey(element) {
    return element.getAttribute("data-editable") || element.getAttribute("data-movable");
  }

  function createDynamicBox(box) {
    var anchor = document.querySelector('[data-editable="' + box.afterKey + '"]');
    if (!anchor) {
      anchor = document.querySelector('[data-editable="footer-tagline"]');
    }

    var clone = document.createElement(box.tagName || "p");
    clone.className = box.className || "editable-clone";
    clone.setAttribute("data-editable", box.key);
    clone.setAttribute("data-dynamic-box", "true");
    clone.setAttribute("data-after-editable", box.afterKey || anchor.getAttribute("data-editable"));
    clone.innerHTML = box.html || "New text box";
    applyStyle(clone, box.styles);
    anchor.insertAdjacentElement("afterend", clone);
    registerEditable(clone);
    return clone;
  }

  function loadEdits() {
    var saved = readStorage();

    if (!Object.keys(saved).length) {
      loadLegacyTextEdits();
      return;
    }

    (saved.__dynamicBoxes || []).forEach(createDynamicBox);
    (saved.__deletedKeys || []).forEach(function (key) {
      var element = document.querySelector('[data-editable="' + key + '"], [data-movable="' + key + '"]');
      if (element) {
        element.remove();
      }
    });
    (saved.__deletedSections || []).forEach(function (key) {
      var anchor = document.querySelector('[data-editable="' + key + '"], [data-movable="' + key + '"]');
      if (anchor) {
        var section = anchor.closest(".service-card, .project-card, .timeline li, .timeline, .programs, .intro-band > div, section");
        if (section) {
          section.remove();
        }
      }
    });
    refreshEditableLists();

    editables.forEach(function (element) {
      var key = element.getAttribute("data-editable");
      var item = saved[key];
      if (!item) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(item, "html")) {
        element.innerHTML = item.html;
      }
      applyStyle(element, item.styles);
    });

    movables.forEach(function (element) {
      var key = element.getAttribute("data-movable");
      var item = saved[key];
      if (item) {
        applyStyle(element, item.styles);
      }
    });
  }

  function collectEdits() {
    var edits = {};
    var dynamicBoxes = [];
    var deletedKeys = readStorage().__deletedKeys || [];
    var deletedSections = readStorage().__deletedSections || [];
    editables.forEach(function (element) {
      var styles = {};
      styleProperties.forEach(function (property) {
        if (element.style[property]) {
          styles[property] = element.style[property];
        }
      });

      edits[element.getAttribute("data-editable")] = {
        html: element.innerHTML.trim(),
        styles: styles
      };

      if (element.getAttribute("data-dynamic-box") === "true") {
        dynamicBoxes.push({
          key: element.getAttribute("data-editable"),
          afterKey: element.getAttribute("data-after-editable"),
          tagName: element.tagName.toLowerCase(),
          className: element.className.replace(/\s?selected-editable/g, "").trim(),
          html: element.innerHTML.trim(),
          styles: styles
        });
      }
    });

    movables.forEach(function (element) {
      var styles = {};
      styleProperties.forEach(function (property) {
        if (element.style[property]) {
          styles[property] = element.style[property];
        }
      });
      edits[element.getAttribute("data-movable")] = {
        html: "",
        styles: styles
      };
    });

    edits.__dynamicBoxes = dynamicBoxes;
    edits.__deletedKeys = deletedKeys;
    edits.__deletedSections = deletedSections;
    return edits;
  }

  function saveEdits() {
    localStorage.setItem(storageKey, JSON.stringify(collectEdits()));
    setStatus("Saved in this browser");
  }

  function toNumber(value) {
    var match = String(value || "").match(/[\d.]+/);
    return match ? match[0] : "";
  }

  function rgbToHex(value) {
    var match = String(value || "").match(/\d+/g);
    if (!match || match.length < 3) {
      return "#000000";
    }
    return (
      "#" +
      match
        .slice(0, 3)
        .map(function (part) {
          return ("0" + Number(part).toString(16)).slice(-2);
        })
        .join("")
    );
  }

  function selectElement(element) {
    if (!element) {
      return;
    }

    if (selectedElement) {
      selectedElement.classList.remove("selected-editable");
    }

    selectedElement = element;
    selectedElement.classList.add("selected-editable");

    var computed = window.getComputedStyle(selectedElement);
    controls.fontFamily.value = selectedElement.style.fontFamily || "";
    controls.fontSize.value = toNumber(selectedElement.style.fontSize || computed.fontSize);
    controls.lineHeight.value = toNumber(selectedElement.style.lineHeight || computed.lineHeight);
    controls.width.value = toNumber(selectedElement.style.width || computed.width);
    controls.height.value = toNumber(selectedElement.style.height || computed.height);
    controls.padding.value = toNumber(selectedElement.style.padding || computed.paddingTop);
    controls.textAlign.value = selectedElement.style.textAlign || "";
    controls.color.value = rgbToHex(selectedElement.style.color || computed.color);
    controls.backgroundColor.value = rgbToHex(selectedElement.style.backgroundColor || computed.backgroundColor);

    setStatus("Selected: " + editableKey(selectedElement));
    positionResizeHandle();
  }

  function positionResizeHandle() {
    if (!editing || !selectedElement) {
      resizeHandle.classList.add("is-hidden");
      moveHandle.classList.add("is-hidden");
      return;
    }

    var rect = selectedElement.getBoundingClientRect();
    resizeHandle.style.left = rect.right - 2 + "px";
    resizeHandle.style.top = rect.bottom - 2 + "px";
    resizeHandle.classList.remove("is-hidden");
    if (selectedElement.closest(".education-timeline")) {
      moveHandle.classList.add("is-hidden");
      return;
    }
    moveHandle.style.left = rect.left - 30 + "px";
    moveHandle.style.top = rect.top - 3 + "px";
    moveHandle.classList.remove("is-hidden");
  }

  function setEditing(nextEditing) {
    editing = nextEditing;
    refreshEditableLists();
    document.body.classList.toggle("is-editing", editing);
    editToggle.setAttribute("aria-pressed", String(editing));
    editToggle.textContent = editing ? "Editing on" : "Edit site";

    editables.forEach(function (element) {
      element.setAttribute("contenteditable", String(editing));
      element.setAttribute("spellcheck", "true");
      if (editing) {
        element.setAttribute("title", "Click and type to edit. Use the toolbar to change style.");
      } else {
        element.removeAttribute("title");
        element.classList.remove("selected-editable");
      }
    });

    movables.forEach(function (element) {
      element.setAttribute("title", editing ? "Use the handles to move or resize this element." : "");
    });

    if (editing && !selectedElement) {
      selectElement(editables[0]);
    }

    if (!editing) {
      selectedElement = null;
      positionResizeHandle();
    }

    setStatus(editing ? "Click text to edit and style" : "Edit mode off");
  }

  function applyControl(property, value) {
    if (!selectedElement) {
      setStatus("Select text first");
      return;
    }

    if (value === "") {
      selectedElement.style[property] = "";
      return;
    }

    if (property === "fontSize" || property === "width" || property === "height" || property === "padding") {
      selectedElement.style[property] = value + "px";
      if (property === "width" || property === "height") {
        selectedElement.style.display = "inline-block";
        selectedElement.style.overflow = "visible";
        selectedElement.style.maxWidth = "none";
      }
    } else {
      selectedElement.style[property] = value;
    }

    setStatus("Style changed");
    positionResizeHandle();
  }

  function exportHtml() {
    saveEdits();
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll("[contenteditable]").forEach(function (element) {
      element.removeAttribute("contenteditable");
      element.removeAttribute("spellcheck");
      element.removeAttribute("title");
      element.classList.remove("selected-editable");
    });
    clone.querySelectorAll(".edit-toolbar, .resize-handle, .move-handle, script[src^='editor.js']").forEach(function (element) {
      element.remove();
    });
    clone.querySelector("body").classList.remove("is-editing");

    var html = "<!doctype html>\n" + clone.outerHTML;
    var blob = new Blob([html], { type: "text/html" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "portfolio-edited.html";
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("Exported edited HTML");
  }

  function resetSelectedStyle() {
    if (!selectedElement) {
      setStatus("Select text first");
      return;
    }

    styleProperties.forEach(function (property) {
      selectedElement.style[property] = "";
    });
    selectElement(selectedElement);
    setStatus("Selected style reset");
  }

  function duplicateSelectedBox() {
    if (!selectedElement) {
      setStatus("Select a text box first");
      return;
    }

    var key = "custom-box-" + Date.now();
    var sourceKey = selectedElement.getAttribute("data-editable");
    var clone = selectedElement.cloneNode(true);
    clone.classList.remove("selected-editable");
    clone.classList.add("editable-clone");
    clone.setAttribute("data-editable", key);
    clone.setAttribute("data-dynamic-box", "true");
    clone.setAttribute("data-after-editable", sourceKey);
    clone.innerHTML = selectedElement.innerHTML || "New text box";
    selectedElement.insertAdjacentElement("afterend", clone);
    registerEditable(clone);
    selectElement(clone);
    saveEdits();
    setStatus("Text box duplicated");
  }

  function rememberDeletedKey(key) {
    var saved = collectEdits();
    saved.__deletedKeys = saved.__deletedKeys || [];
    if (saved.__deletedKeys.indexOf(key) === -1) {
      saved.__deletedKeys.push(key);
    }
    localStorage.setItem(storageKey, JSON.stringify(saved));
  }

  function rememberDeletedSection(key) {
    var saved = collectEdits();
    saved.__deletedSections = saved.__deletedSections || [];
    if (saved.__deletedSections.indexOf(key) === -1) {
      saved.__deletedSections.push(key);
    }
    localStorage.setItem(storageKey, JSON.stringify(saved));
  }

  function deleteSelectedBox() {
    if (!selectedElement) {
      setStatus("Select a box first");
      return;
    }

    var key = editableKey(selectedElement);
    if (!key) {
      setStatus("This element cannot be deleted");
      return;
    }

    var confirmed = window.confirm("Delete the selected box?");
    if (!confirmed) {
      return;
    }

    selectedElement.remove();
    selectedElement = null;
    rememberDeletedKey(key);
    refreshEditableLists();
    positionResizeHandle();
    setStatus("Box deleted");
  }

  function deleteContainingSection() {
    if (!selectedElement) {
      setStatus("Select a box inside the section first");
      return;
    }

    var section = selectedElement.closest(".service-card, .project-card, .timeline li, .timeline, .programs, .intro-band > div, section");
    if (!section || section.classList.contains("hero")) {
      setStatus("Select a deletable section first");
      return;
    }

    var confirmed = window.confirm("Delete the whole selected section/card/item?");
    if (!confirmed) {
      return;
    }

    var key = editableKey(selectedElement);
    section.remove();
    selectedElement = null;
    if (key) {
      rememberDeletedSection(key);
    } else {
      saveEdits();
    }
    refreshEditableLists();
    positionResizeHandle();
    setStatus("Section deleted");
  }

  function addLinkToSelection() {
    if (!selectedElement) {
      setStatus("Select text first");
      return;
    }

    var url = window.prompt("Paste the link URL:");
    if (!url) {
      return;
    }

    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url) && !url.startsWith("#")) {
      url = "https://" + url;
    }

    var selection = window.getSelection();
    var hasSelection =
      selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      selectedElement.contains(selection.anchorNode) &&
      selectedElement.contains(selection.focusNode);

    if (hasSelection) {
      var range = selection.getRangeAt(0);
      var link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.appendChild(range.extractContents());
      range.insertNode(link);
      selection.removeAllRanges();
    } else {
      var existingText = selectedElement.textContent.trim() || "Link text";
      selectedElement.innerHTML = '<a href="' + url + '" target="_blank" rel="noreferrer noopener">' + existingText + "</a>";
    }

    saveEdits();
    setStatus("Link added");
  }

  function resetEdits() {
    var confirmed = window.confirm("Reset all browser-saved text and style edits, then reload?");
    if (!confirmed) {
      return;
    }
    localStorage.removeItem(storageKey);
    localStorage.removeItem(legacyStorageKey);
    window.location.reload();
  }

  editToggle.addEventListener("click", function () {
    setEditing(!editing);
  });

  resizeHandle.addEventListener("mousedown", function (event) {
    if (!selectedElement) {
      return;
    }
    event.preventDefault();
    var rect = selectedElement.getBoundingClientRect();
    isResizing = true;
    resizeStart = {
      x: event.clientX,
      y: event.clientY,
      width: rect.width,
      height: rect.height
    };
    selectedElement.style.display = "inline-block";
    selectedElement.style.overflow = "visible";
    selectedElement.style.maxWidth = "none";
    document.body.classList.add("is-resizing");
  });

  moveHandle.addEventListener("mousedown", function (event) {
    if (!selectedElement) {
      return;
    }
    event.preventDefault();
    isMoving = true;
    selectedElement.style.position = "relative";
    selectedElement.style.display = "inline-block";
    selectedElement.style.overflow = "visible";
    selectedElement.style.maxWidth = "none";
    moveStart = {
      x: event.clientX,
      y: event.clientY,
      left: parseFloat(selectedElement.style.left || "0") || 0,
      top: parseFloat(selectedElement.style.top || "0") || 0
    };
    document.body.classList.add("is-moving");
  });

  document.addEventListener("mousemove", function (event) {
    if (!isResizing || !selectedElement || !resizeStart) {
      if (isMoving && selectedElement && moveStart) {
        selectedElement.style.left = Math.round(moveStart.left + event.clientX - moveStart.x) + "px";
        selectedElement.style.top = Math.round(moveStart.top + event.clientY - moveStart.y) + "px";
        positionResizeHandle();
      }
      return;
    }
    var nextWidth = Math.max(1, resizeStart.width + event.clientX - resizeStart.x);
    var nextHeight = Math.max(24, resizeStart.height + event.clientY - resizeStart.y);
    selectedElement.style.width = Math.round(nextWidth) + "px";
    selectedElement.style.height = Math.round(nextHeight) + "px";
    controls.width.value = Math.round(nextWidth);
    controls.height.value = Math.round(nextHeight);
    positionResizeHandle();
  });

  document.addEventListener("mouseup", function () {
    if (!isResizing && !isMoving) {
      return;
    }
    isResizing = false;
    isMoving = false;
    resizeStart = null;
    moveStart = null;
    document.body.classList.remove("is-resizing");
    document.body.classList.remove("is-moving");
    saveEdits();
    positionResizeHandle();
  });

  saveButton.addEventListener("click", saveEdits);
  exportButton.addEventListener("click", exportHtml);
  duplicateButton.addEventListener("click", duplicateSelectedBox);
  deleteBoxButton.addEventListener("click", deleteSelectedBox);
  deleteSectionButton.addEventListener("click", deleteContainingSection);
  addLinkButton.addEventListener("click", addLinkToSelection);
  resetStyleButton.addEventListener("click", resetSelectedStyle);
  resetButton.addEventListener("click", resetEdits);

  Object.keys(controls).forEach(function (property) {
    controls[property].addEventListener("input", function (event) {
      applyControl(property, event.target.value);
    });
    controls[property].addEventListener("change", function (event) {
      applyControl(property, event.target.value);
    });
  });

  document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveEdits();
    }
  });

  document.addEventListener("click", function (event) {
    var selectable = event.target.closest("[data-editable], [data-movable]");
    if (editing && selectable) {
      if (selectable.hasAttribute("data-editable")) {
        selectable.setAttribute("contenteditable", "true");
        selectable.setAttribute("spellcheck", "true");
      }
      selectElement(selectable);
      if (selectable.tagName.toLowerCase() === "a") {
        event.preventDefault();
      }
    }
  });

  window.addEventListener("scroll", positionResizeHandle);
  window.addEventListener("resize", positionResizeHandle);

  loadEdits();
  var brandMark = document.querySelector(".brand-mark");
  if (brandMark) {
    brandMark.textContent = "JB";
  }
  var brandName = document.querySelector('[data-editable="brand-name"]');
  if (brandName) {
    brandName.textContent = "Translator & Interpreter";
  }
})();
