EpubReflowable.ReflowableAnnotations = Backbone.Model.extend({

    defaults : {
        "saveCallback" : undefined,
        "callbackContext" : undefined
    },

    initialize : function () {
        this.epubCFI = new EpubCFIModule();
    },

    saveAnnotation : function (CFI, spinePosition) {

        var saveAnnotation = this.get("saveCallback");
        saveAnnotation.call(this.get("callbackContext"), CFI, spinePosition);
    },

    getSelectionInfo : function (selectedRange) {

        // Generate CFI for selected text
        var CFI = "";
        var intervalState = {
            startElementFound : false,
            endElementFound : false
        };
        var selectedElements = [];

        this.findSelectedElements(
            selectedRange.commonAncestorContainer, 
            selectedRange.startContainer, 
            selectedRange.endContainer,
            intervalState,
            selectedElements, 
            "p"
            );

        // Return a list of selected text nodes and the CFI
        return {
            CFI : CFI,
            selectedElements : selectedElements
        };
    },

    generateCharacterOffsetCFI : function (characterOffset, $startElement, spineItemIdref, packageDocumentDom) {

        // Save the position marker
        generatedCFI = EPUBcfi.Generator.generateCharacterOffsetCFI(
            $startElement,
            characterOffset, 
            spineItemIdref, 
            packageDocumentDom, 
            ["cfi-marker", "audiError"], 
            [], 
            ["MathJax_Message"]);
        return generatedCFI;
    },

    findExistingLastPageMarker : function ($visibleTextNode) {

        // Check if a last page marker already exists on this page
        try {
            
            var existingCFI = undefined;
            $.each($visibleTextNode.parent().contents(), function () {

                if ($(this).hasClass("last-page")) {
                    lastPageMarkerExists = true;
                    existingCFI = $(this).attr("data-last-page-cfi");

                    // Break out of loop
                    return false;
                }
            });

            return existingCFI;
        }
        catch (e) {

            console.log("Could not generate CFI for non-text node as first visible element on page");

            // No need to execute the rest of the save position method if the first visible element is not a text node
            return undefined;
        }
    },

    // REFACTORING CANDIDATE: Convert this to jquery
    findSelectedElements : function (currElement, startElement, endElement, intervalState, selectedElements, elementTypes) {

        if (currElement === startElement) {
            intervalState.startElementFound = true;
        }

        if (intervalState.startElementFound === true) {
            this.addElement(currElement, selectedElements, elementTypes);
        }

        if (currElement === endElement) {
            intervalState.endElementFound = true;
            return;
        }

        if (currElement.firstChild) {
            this.findSelectedElements(currElement.firstChild, startElement, endElement, intervalState, selectedElements, elementTypes);
            if (intervalState.endElementFound) {
                return;
            }
        }

        if (currElement.nextSibling) {
            this.findSelectedElements(currElement.nextSibling, startElement, endElement, intervalState, selectedElements, elementTypes);
            if (intervalState.endElementFound) {
                return;
            }
        }
    },

    addElement : function (currElement, selectedElements, elementTypes) {

        // Check if the node is one of the types
        if (currElement.tagName === "P" || currElement.tagName === "DIV") {
            selectedElements.push(currElement);
        }
    },

    injectHighlightMarkers : function (selectionRange) {

        var highlightRange;
        if (selectionRange.startContainer === selectionRange.endContainer) {
            highlightRange = this.injectHighlightInSameNode(selectionRange);
        } else {
            highlightRange = this.injectHighlightsInDifferentNodes(selectionRange);
        }

        return highlightRange;
    },

    injectHighlightInSameNode : function (selectionRange) {

        var startNode;
        var startOffset = selectionRange.startOffset;
        var endNode = selectionRange.endContainer;
        var endOffset = selectionRange.endOffset;
        var $startMarker = $("<span id='highlight-start-epubcfi(1)'></span>");
        var $endMarker = $("<span id='highlight-start-epubcfi(2)'></span>");
        var highlightRange;

        // Rationale: The end marker is injected before the start marker because when the text node is split by the 
        //   end marker first, the offset for the start marker will still be the same and we do not need to recalculate 
        //   the offset for the newly created end node.

        // inject end marker
        this.epubCFI.injectElementAtOffset(
            $(endNode), 
            endOffset,
            $endMarker
        );

        startNode = $endMarker[0].previousSibling;

        // inject start marker
        this.epubCFI.injectElementAtOffset(
            $(startNode), 
            startOffset,
            $startMarker
        );

        // reconstruct range
        highlightRange = document.createRange();
        highlightRange.setStart($startMarker[0].nextSibling, 0);
        highlightRange.setEnd($endMarker[0].previousSibling, $endMarker[0].previousSibling.length - 1);

        return highlightRange;
    },

    injectHighlightsInDifferentNodes : function (selectionRange) {

        var startNode = selectionRange.startContainer;
        var startOffset = selectionRange.startOffset;
        var endNode = selectionRange.endContainer;
        var endOffset = selectionRange.endOffset;
        var $startMarker = $("<span id='highlight-start-epubcfi(1)'></span>");
        var $endMarker = $("<span id='highlight-start-epubcfi(2)'></span>");
        var highlightRange;

        // inject start
        this.epubCFI.injectElementAtOffset(
            $(startNode), 
            startOffset,
            $startMarker
        );

        // inject end
        this.epubCFI.injectElementAtOffset(
            $(endNode), 
            endOffset,
            $endMarker
        );

        // reconstruct range
        highlightRange = document.createRange();
        highlightRange.setStart($startMarker[0].nextSibling, 0);
        highlightRange.setEnd($endMarker[0].previousSibling, $endMarker[0].previousSibling.length - 1);

        return highlightRange;
    }
});
