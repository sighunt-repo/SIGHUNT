function getCanvasFingerprint() {
    var winding = false;
    var geometry;
    var text;
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    var context = canvas.getContext('2d');
    if (!context || !canvas.toDataURL) {
        geometry = text = 'unsupported';
    }
    else {
        winding = doesSupportWinding(context);
        var _a = renderImages(canvas, context), geo = _a[0], txt = _a[1];
        geometry = geo;
        text = txt;
    }
    return { winding: winding, geometry: geometry, text: text };
}
function doesSupportWinding(context) {
    context.rect(0, 0, 10, 10);
    context.rect(2, 2, 6, 6);
    return !context.isPointInPath(5, 5, 'evenodd');
}
function renderImages(canvas, context) {
    renderTextImage(canvas, context);
    var textImage1 = canvas.toDataURL();
    var textImage2 = canvas.toDataURL();
    if (textImage1 !== textImage2) {
        return ['unstable', 'unstable'];
    }
    renderGeometryImage(canvas, context);
    var geometryImage = canvas.toDataURL();
    return [geometryImage, textImage1];
}
function renderTextImage(canvas, context) {
    canvas.width = 240;
    canvas.height = 60;
    context.textBaseline = 'alphabetic';
    context.fillStyle = '#f60';
    context.fillRect(100, 1, 62, 20);
    context.fillStyle = '#069';
    context.font = '11pt "Times New Roman"';
    var printedText = "Cwm fjordbank gly ".concat(String.fromCharCode(55357, 56835) /* 😃 */);
    context.fillText(printedText, 2, 15);
    context.fillStyle = 'rgba(102, 204, 0, 0.2)';
    context.font = '18pt Arial';
    context.fillText(printedText, 4, 45);
}
function renderGeometryImage(canvas, context) {
    canvas.width = 122;
    canvas.height = 110;
    context.globalCompositeOperation = 'multiply';
    var circles = [
        ['#f2f', 40, 40],
        ['#2ff', 80, 40],
        ['#ff2', 60, 80],
    ];
    for (var _i = 0, circles_1 = circles; _i < circles_1.length; _i++) {
        var _a = circles_1[_i], color = _a[0], x = _a[1], y = _a[2];
        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, 40, 0, Math.PI * 2, true);
        context.closePath();
        context.fill();
    }
    context.fillStyle = '#f9c';
    context.arc(60, 60, 60, 0, Math.PI * 2, true);
    context.arc(60, 60, 20, 0, Math.PI * 2, true);
    context.fill('evenodd');
}

window.getCanvasFingerprint = getCanvasFingerprint;