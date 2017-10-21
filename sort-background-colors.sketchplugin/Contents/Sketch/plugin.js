/**
 * PLUGIN ENTRY POINT
 * Sorts selected layers (or layers in selected artboard) by their background hue value
 * If layers are selected, they are also grouped within a new artboard
 * @param  {Object} context
 */
function sortByHue (context) {
  const document = context.document;
  const page = document.currentPage();
  let layers = context.selection;
  let artboard = null;

  // Check if single artboard has been selected
  // If so, use it for sorting its children!
  if (layers.length === 1 && layers[0].isKindOfClass(MSArtboardGroup)) {
    artboard = layers[0];
    layers = layers[0].layers();
  }

  // Check for selection
  if (layers.length < 1) {
    document.showMessage('No layers selected!');
    return;
  }

  // Filter given layers to ensure we only sort layers we can actually
  // read background color from
  layers = getLayersWithBackgroundColor(layers);
  if (layers.length < 1) {
    document.showMessage('No layers with background selected!');
    return;
  }

  // If no artboard was selected, create a new one
  if (!artboard) {
    artboard = MSArtboardGroup.new();
    artboard.name = 'Colors';
    artboard.frame().left = layers[0].frame().left();
    artboard.frame().top = layers[0].frame().top();
    artboard.frame().width = 600;
    artboard.frame().height = 600;
    page.addLayer(artboard);
    layers.forEach(layer => {
      artboard.addLayer(layer.copy());
      layer.removeFromParent();
    });
    layers = getLayersWithBackgroundColor(artboard.layers());
  }

  // Sort layers ✨
  sortLayersByHue(layers);

  // Position layers nicely in parent artboard
  const parentFrame = artboard.frame();
  let height = layers[0].frame().height() + 10;
  let lastFrame = null;
  layers.forEach((layer, i) => {
    if (!lastFrame) {
      layer.frame().top = 5;
      layer.frame().left = 5;
    } else {
      let newRow =
        lastFrame.left() + lastFrame.width() + 5 + layer.frame().width() >
        parentFrame.width() - 10;
      if (newRow) {
        layer.frame().left = 5;
        layer.frame().top = lastFrame.top() + lastFrame.height() + 5;
        height += layer.frame().height() + 5;
      } else {
        layer.frame().left = lastFrame.left() + lastFrame.width() + 5;
        layer.frame().top = lastFrame.top();
      }
    }
    lastFrame = layer.frame();
  });
  parentFrame.height = height;
}

/**
 * Filter given layers for thos that we can actually extract background
 * color value from (MSShapeGroup, MSSymbolMaster, MSSymbolInstance)
 * @param  {Array} layers
 * @return {Array}
 */
function getLayersWithBackgroundColor (layers) {
  let colorLayers = [];
  layers.forEach(layer => {
    if (getLayerBackground(layer)) {
      colorLayers.push(layer);
    }
  });
  return colorLayers;
}

/**
 * Get color schema from MSShapeGroup and MSSymbol*s
 * @param  {MSSymbolMaster|MSSymbolInstance|MSShapeGroup} layers
 * @return {MSColor}
 */
function getLayerBackground (layer) {
  if (layer.isKindOfClass(MSShapeGroup)) {
    // MSShapeGroup -> get first fill color
    return layer.style().fills()[0].color();
  } else if (layer.isKindOfClass(MSSymbolInstance)) {
    // MSSymbolInstance -> get first child background
    const children = layer.symbolMaster().children();
    children.forEach(child => {
      if (child.isKindOfClass(MSShapeGroup)) {
        return child.style().fills()[0].color();
      }
    });
  } else if (layer.isKindOfClass(MSSymbolMaster)) {
    // MSSymbolMaster -> get first child background
    const children = layer.children();
    children.forEach(child => {
      if (child.isKindOfClass(MSShapeGroup)) {
        return child.style().fills()[0].color();
      }
    });
  }
  return null;
}

/**
 * Simple array sort by layer hue value
 * @param  {Array} layers
 */
function sortLayersByHue (layers) {
  layers.sort(function (a, b) {
    return getLayerHue(a) - getLayerHue(b);
  });
}

/**
 * Get hue value from given layer
 * @param  {MSLayer} layer
 * @return {Object|null}
 */
function getLayerHue (layer) {
  const color = constructLayerColor(layer);
  if (!color) {
    return 0;
  }
  return color.hue;
}

/**
 * Construct meaningful color object from given layer
 * This is based on the nice work done in the following jsfiddle :)
 *   http://jsfiddle.net/shanfan/ojgp5718/
 * @param  {MSLayer} layer
 * @return {Obejct}
 */
function constructLayerColor (layer) {
  const color = getLayerBackground(layer);
  if (!color) {
    return null;
  }

  // Get the RGB values to calculate the Hue
  const r = parseFloat(color.red());
  const g = parseFloat(color.green());
  const b = parseFloat(color.blue());

  // Getting the Max and Min values for Chroma
  const max = Math.max.apply(Math, [ r, g, b ]);
  const min = Math.min.apply(Math, [ r, g, b ]);

  // Variables for HSV value of hex color
  let chr = max - min;
  let hue = 0;
  let val = max;
  let sat = 0;

  if (val > 0) {
    // Calculate Saturation only if Value isn't 0
    sat = chr / val;
    if (sat > 0) {
      if (r == max) {
        hue = 60 * ((g - min - (b - min)) / chr);
        if (hue < 0) {
          hue += 360;
        }
      } else if (g == max) {
        hue = 120 + 60 * ((b - min - (r - min)) / chr);
      } else if (b == max) {
        hue = 240 + 60 * ((r - min - (g - min)) / chr);
      }
    }
  }

  return {
    chroma: chr,
    hue,
    sat,
    val,
    luma: 0.3 * r + 0.59 * g + 0.11 * b,
    red: r,
    green: g,
    blue: b
  };
}
