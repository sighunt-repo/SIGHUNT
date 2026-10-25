function getFontsFingerprint() {
    return new Promise(function (resolve) {
        var testString = 'mmMwWLliI0O&1';
        var textSize = '48px';
        var baseFonts = ['monospace', 'sans-serif', 'serif'];
        var fontList = [
            'sans-serif-thin', 'ARNO PRO', 'Agency FB', 'Arabic Typesetting',
            'Arial Unicode MS', 'AvantGarde Bk BT', 'BankGothic Md BT', 'Batang',
            'Bitstream Vera Sans Mono', 'Calibri', 'Century', 'Century Gothic',
            'Clarendon', 'EUROSTILE', 'Franklin Gothic', 'Futura Bk BT', 'Futura Md BT',
            'GOTHAM', 'Gill Sans', 'HELV', 'Haettenschweiler', 'Helvetica Neue',
            'Humanst521 BT', 'Leelawadee', 'Letter Gothic', 'Levenim MT', 'Lucida Bright',
            'Lucida Sans', 'Menlo', 'MS Mincho', 'MS Outlook', 'MS Reference Specialty',
            'MS UI Gothic', 'MT Extra', 'MYRIAD PRO', 'Marlett', 'Meiryo UI',
            'Microsoft Uighur', 'Minion Pro', 'Monotype Corsiva', 'PMingLiU',
            'Pristina', 'SCRIPTINA', 'Segoe UI Light', 'Serifa', 'SimHei',
            'Small Fonts', 'Staccato222 BT', 'TRAJAN PRO', 'Univers CE 55 Medium',
            'Vrinda', 'ZWAdobeF'
        ];
        var defaultWidth = {};
        var defaultHeight = {};
        var spansContainer = document.createElement('div');
        spansContainer.style.visibility = 'hidden';
        spansContainer.style.position = 'absolute';
        spansContainer.style.top = '0';
        spansContainer.style.left = '0';
        spansContainer.style.fontSize = textSize;
        var createSpan = function (fontFamily) {
            var span = document.createElement('span');
            span.style.fontFamily = fontFamily;
            span.textContent = testString;
            spansContainer.appendChild(span);
            return span;
        };
        var createSpanWithFallback = function (font, baseFont) {
            return createSpan("'".concat(font, "',").concat(baseFont));
        };
        // Create spans for base fonts and record their default dimensions
        var baseFontSpans = baseFonts.map(createSpan);
        baseFonts.forEach(function (font, i) {
            defaultWidth[font] = baseFontSpans[i].offsetWidth;
            defaultHeight[font] = baseFontSpans[i].offsetHeight;
        });
        // Create spans for all test fonts against each base font
        var fontSpans = {};
        var _loop_1 = function (font) {
            fontSpans[font] = baseFonts.map(function (base) { return createSpanWithFallback(font, base); });
        };
        for (var _i = 0, fontList_1 = fontList; _i < fontList_1.length; _i++) {
            var font = fontList_1[_i];
            _loop_1(font);
        }
        document.body.appendChild(spansContainer);
        var availableFonts = fontList.filter(function (font) {
            return fontSpans[font].some(function (span, i) {
                return span.offsetWidth !== defaultWidth[baseFonts[i]] ||
                    span.offsetHeight !== defaultHeight[baseFonts[i]];
            });
        });
        document.body.removeChild(spansContainer);
        resolve(availableFonts);
    });
}

window.getFontsFingerprint = getFontsFingerprint;