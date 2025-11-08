"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_lib_raven_render_ts";
exports.ids = ["_rsc_lib_raven_render_ts"];
exports.modules = {

/***/ "(rsc)/./lib/raven/render.ts":
/*!*****************************!*\
  !*** ./lib/raven/render.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__),\n/* harmony export */   renderMirror: () => (/* binding */ renderMirror),\n/* harmony export */   renderShareableMirror: () => (/* binding */ renderShareableMirror)\n/* harmony export */ });\n// Lightweight stub for Raven renderer.\n// Exists to satisfy build-time resolution when the full Raven module\n// is not bundled in this environment. The Poetic Brain pipeline will\n// merge this output with its local fallback so required fields remain\n// populated.\nasync function renderShareableMirror({ geo, prov, options }) {\n    // Do not provide picture/feeling/container/option/next_step here so the\n    // pipeline's local builder supplies them. Add provenance to appendix.\n    return {\n        appendix: {\n            renderer: \"raven-stub\",\n            prov: prov ?? {\n                source: \"raven-stub\"\n            },\n            options: options ?? {},\n            echoed_aspects: Array.isArray(geo?.aspects) ? geo.aspects.length : 0\n        }\n    };\n}\nconst renderMirror = renderShareableMirror;\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (renderShareableMirror);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvcmF2ZW4vcmVuZGVyLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLHVDQUF1QztBQUN2QyxxRUFBcUU7QUFDckUscUVBQXFFO0FBQ3JFLHNFQUFzRTtBQUN0RSxhQUFhO0FBSU4sZUFBZUEsc0JBQXNCLEVBQzFDQyxHQUFHLEVBQ0hDLElBQUksRUFDSkMsT0FBTyxFQUtSO0lBQ0Msd0VBQXdFO0lBQ3hFLHNFQUFzRTtJQUN0RSxPQUFPO1FBQ0xDLFVBQVU7WUFDUkMsVUFBVTtZQUNWSCxNQUFNQSxRQUFRO2dCQUFFSSxRQUFRO1lBQWE7WUFDckNILFNBQVNBLFdBQVcsQ0FBQztZQUNyQkksZ0JBQWdCQyxNQUFNQyxPQUFPLENBQUNSLEtBQUtTLFdBQVdULElBQUlTLE9BQU8sQ0FBQ0MsTUFBTSxHQUFHO1FBQ3JFO0lBQ0Y7QUFDRjtBQUVPLE1BQU1DLGVBQWVaLHNCQUFzQjtBQUNsRCxpRUFBZUEscUJBQXFCQSxFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vd292ZW4td2ViLWFwcC8uL2xpYi9yYXZlbi9yZW5kZXIudHM/MWQzYSJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWdodHdlaWdodCBzdHViIGZvciBSYXZlbiByZW5kZXJlci5cbi8vIEV4aXN0cyB0byBzYXRpc2Z5IGJ1aWxkLXRpbWUgcmVzb2x1dGlvbiB3aGVuIHRoZSBmdWxsIFJhdmVuIG1vZHVsZVxuLy8gaXMgbm90IGJ1bmRsZWQgaW4gdGhpcyBlbnZpcm9ubWVudC4gVGhlIFBvZXRpYyBCcmFpbiBwaXBlbGluZSB3aWxsXG4vLyBtZXJnZSB0aGlzIG91dHB1dCB3aXRoIGl0cyBsb2NhbCBmYWxsYmFjayBzbyByZXF1aXJlZCBmaWVsZHMgcmVtYWluXG4vLyBwb3B1bGF0ZWQuXG5cbnR5cGUgQW55UmVjb3JkID0gUmVjb3JkPHN0cmluZywgYW55PjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmRlclNoYXJlYWJsZU1pcnJvcih7XG4gIGdlbyxcbiAgcHJvdixcbiAgb3B0aW9ucyxcbn06IHtcbiAgZ2VvOiBBbnlSZWNvcmQ7XG4gIHByb3Y/OiBBbnlSZWNvcmQ7XG4gIG9wdGlvbnM/OiBBbnlSZWNvcmQ7XG59KTogUHJvbWlzZTxBbnlSZWNvcmQ+IHtcbiAgLy8gRG8gbm90IHByb3ZpZGUgcGljdHVyZS9mZWVsaW5nL2NvbnRhaW5lci9vcHRpb24vbmV4dF9zdGVwIGhlcmUgc28gdGhlXG4gIC8vIHBpcGVsaW5lJ3MgbG9jYWwgYnVpbGRlciBzdXBwbGllcyB0aGVtLiBBZGQgcHJvdmVuYW5jZSB0byBhcHBlbmRpeC5cbiAgcmV0dXJuIHtcbiAgICBhcHBlbmRpeDoge1xuICAgICAgcmVuZGVyZXI6ICdyYXZlbi1zdHViJyxcbiAgICAgIHByb3Y6IHByb3YgPz8geyBzb3VyY2U6ICdyYXZlbi1zdHViJyB9LFxuICAgICAgb3B0aW9uczogb3B0aW9ucyA/PyB7fSxcbiAgICAgIGVjaG9lZF9hc3BlY3RzOiBBcnJheS5pc0FycmF5KGdlbz8uYXNwZWN0cykgPyBnZW8uYXNwZWN0cy5sZW5ndGggOiAwLFxuICAgIH0sXG4gIH0gYXMgQW55UmVjb3JkO1xufVxuXG5leHBvcnQgY29uc3QgcmVuZGVyTWlycm9yID0gcmVuZGVyU2hhcmVhYmxlTWlycm9yO1xuZXhwb3J0IGRlZmF1bHQgcmVuZGVyU2hhcmVhYmxlTWlycm9yO1xuXG4iXSwibmFtZXMiOlsicmVuZGVyU2hhcmVhYmxlTWlycm9yIiwiZ2VvIiwicHJvdiIsIm9wdGlvbnMiLCJhcHBlbmRpeCIsInJlbmRlcmVyIiwic291cmNlIiwiZWNob2VkX2FzcGVjdHMiLCJBcnJheSIsImlzQXJyYXkiLCJhc3BlY3RzIiwibGVuZ3RoIiwicmVuZGVyTWlycm9yIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./lib/raven/render.ts\n");

/***/ })

};
;