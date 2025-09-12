"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/math-brain/route";
exports.ids = ["app/math-brain/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "fs/promises":
/*!******************************!*\
  !*** external "fs/promises" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("fs/promises");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fmath-brain%2Froute&page=%2Fmath-brain%2Froute&appPaths=&pagePath=private-next-app-dir%2Fmath-brain%2Froute.ts&appDir=%2FUsers%2Fdancross%2FDocuments%2FGitHub%2FWovenWebApp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdancross%2FDocuments%2FGitHub%2FWovenWebApp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fmath-brain%2Froute&page=%2Fmath-brain%2Froute&appPaths=&pagePath=private-next-app-dir%2Fmath-brain%2Froute.ts&appDir=%2FUsers%2Fdancross%2FDocuments%2FGitHub%2FWovenWebApp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdancross%2FDocuments%2FGitHub%2FWovenWebApp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_dancross_Documents_GitHub_WovenWebApp_app_math_brain_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/math-brain/route.ts */ \"(rsc)/./app/math-brain/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/math-brain/route\",\n        pathname: \"/math-brain\",\n        filename: \"route\",\n        bundlePath: \"app/math-brain/route\"\n    },\n    resolvedPagePath: \"/Users/dancross/Documents/GitHub/WovenWebApp/app/math-brain/route.ts\",\n    nextConfigOutput,\n    userland: _Users_dancross_Documents_GitHub_WovenWebApp_app_math_brain_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/math-brain/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZtYXRoLWJyYWluJTJGcm91dGUmcGFnZT0lMkZtYXRoLWJyYWluJTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGbWF0aC1icmFpbiUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmRhbmNyb3NzJTJGRG9jdW1lbnRzJTJGR2l0SHViJTJGV292ZW5XZWJBcHAlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGZGFuY3Jvc3MlMkZEb2N1bWVudHMlMkZHaXRIdWIlMkZXb3ZlbldlYkFwcCZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQXNHO0FBQ3ZDO0FBQ2M7QUFDb0I7QUFDakc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLGdIQUFtQjtBQUMzQztBQUNBLGNBQWMseUVBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxpRUFBaUU7QUFDekU7QUFDQTtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUN1SDs7QUFFdkgiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93b3Zlbi13ZWItYXBwLz84N2Y0Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9kYW5jcm9zcy9Eb2N1bWVudHMvR2l0SHViL1dvdmVuV2ViQXBwL2FwcC9tYXRoLWJyYWluL3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL21hdGgtYnJhaW4vcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL21hdGgtYnJhaW5cIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvbWF0aC1icmFpbi9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9kYW5jcm9zcy9Eb2N1bWVudHMvR2l0SHViL1dvdmVuV2ViQXBwL2FwcC9tYXRoLWJyYWluL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL21hdGgtYnJhaW4vcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fmath-brain%2Froute&page=%2Fmath-brain%2Froute&appPaths=&pagePath=private-next-app-dir%2Fmath-brain%2Froute.ts&appDir=%2FUsers%2Fdancross%2FDocuments%2FGitHub%2FWovenWebApp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdancross%2FDocuments%2FGitHub%2FWovenWebApp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/math-brain/route.ts":
/*!*********************************!*\
  !*** ./app/math-brain/route.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   dynamic: () => (/* binding */ dynamic)\n/* harmony export */ });\nconst dynamic = \"force-dynamic\";\n// Serve the legacy Math Brain index.html under /math-brain\nasync function GET(req) {\n    const fs = await Promise.resolve(/*! import() */).then(__webpack_require__.t.bind(__webpack_require__, /*! fs/promises */ \"fs/promises\", 23));\n    const path = await Promise.resolve(/*! import() */).then(__webpack_require__.t.bind(__webpack_require__, /*! path */ \"path\", 23));\n    const filePath = path.resolve(process.cwd(), \"index.html\");\n    try {\n        const file = await fs.readFile(filePath, {\n            encoding: \"utf-8\"\n        });\n        return new Response(file, {\n            status: 200,\n            headers: {\n                \"Content-Type\": \"text/html; charset=utf-8\",\n                \"Cache-Control\": \"no-store\"\n            }\n        });\n    } catch (e) {\n        return new Response(`Math Brain file not found: ${e.message}`, {\n            status: 404\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvbWF0aC1icmFpbi9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7OztBQUVPLE1BQU1BLFVBQVUsZ0JBQWdCO0FBRXZDLDJEQUEyRDtBQUNwRCxlQUFlQyxJQUFJQyxHQUFnQjtJQUN4QyxNQUFNQyxLQUFLLE1BQU0sNEhBQU87SUFDeEIsTUFBTUMsT0FBTyxNQUFNLDhHQUFPO0lBRTFCLE1BQU1DLFdBQVdELEtBQUtFLE9BQU8sQ0FBQ0MsUUFBUUMsR0FBRyxJQUFJO0lBQzdDLElBQUk7UUFDRixNQUFNQyxPQUFPLE1BQU1OLEdBQUdPLFFBQVEsQ0FBQ0wsVUFBVTtZQUFFTSxVQUFVO1FBQVE7UUFDN0QsT0FBTyxJQUFJQyxTQUFTSCxNQUFNO1lBQ3hCSSxRQUFRO1lBQ1JDLFNBQVM7Z0JBQ1AsZ0JBQWdCO2dCQUNoQixpQkFBaUI7WUFDbkI7UUFDRjtJQUNGLEVBQUUsT0FBT0MsR0FBUTtRQUNmLE9BQU8sSUFBSUgsU0FBUyxDQUFDLDJCQUEyQixFQUFFRyxFQUFFQyxPQUFPLENBQUMsQ0FBQyxFQUFFO1lBQUVILFFBQVE7UUFBSTtJQUMvRTtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vd292ZW4td2ViLWFwcC8uL2FwcC9tYXRoLWJyYWluL3JvdXRlLnRzPzViMzAiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlcXVlc3QgfSBmcm9tICduZXh0L3NlcnZlcic7XG5cbmV4cG9ydCBjb25zdCBkeW5hbWljID0gJ2ZvcmNlLWR5bmFtaWMnO1xuXG4vLyBTZXJ2ZSB0aGUgbGVnYWN5IE1hdGggQnJhaW4gaW5kZXguaHRtbCB1bmRlciAvbWF0aC1icmFpblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXE6IE5leHRSZXF1ZXN0KSB7XG4gIGNvbnN0IGZzID0gYXdhaXQgaW1wb3J0KCdmcy9wcm9taXNlcycpO1xuICBjb25zdCBwYXRoID0gYXdhaXQgaW1wb3J0KCdwYXRoJyk7XG5cbiAgY29uc3QgZmlsZVBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2luZGV4Lmh0bWwnKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgZnMucmVhZEZpbGUoZmlsZVBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSk7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShmaWxlLCB7XG4gICAgICBzdGF0dXM6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLTgnLFxuICAgICAgICAnQ2FjaGUtQ29udHJvbCc6ICduby1zdG9yZSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShgTWF0aCBCcmFpbiBmaWxlIG5vdCBmb3VuZDogJHtlLm1lc3NhZ2V9YCwgeyBzdGF0dXM6IDQwNCB9KTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImR5bmFtaWMiLCJHRVQiLCJyZXEiLCJmcyIsInBhdGgiLCJmaWxlUGF0aCIsInJlc29sdmUiLCJwcm9jZXNzIiwiY3dkIiwiZmlsZSIsInJlYWRGaWxlIiwiZW5jb2RpbmciLCJSZXNwb25zZSIsInN0YXR1cyIsImhlYWRlcnMiLCJlIiwibWVzc2FnZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/math-brain/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fmath-brain%2Froute&page=%2Fmath-brain%2Froute&appPaths=&pagePath=private-next-app-dir%2Fmath-brain%2Froute.ts&appDir=%2FUsers%2Fdancross%2FDocuments%2FGitHub%2FWovenWebApp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fdancross%2FDocuments%2FGitHub%2FWovenWebApp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();