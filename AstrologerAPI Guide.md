# **Concept Guide: The "Astrologer API"**

**Status:** Active External Service (Current Dependency)

**Authoritative Spec:** astrologerAPI.docx (OpenAPI 3.1.0, version 4.0.0, Kerykeion Astrology)

This document explains what **“Astrologer API”** means in this project and how it fits into the current **Pure Next.js** architecture.

This is **not** the app's own main API.

For the app’s internal/public API specification, see **API\_REFERENCE.md**.

## **1\. Definition and Role**

The **Astrologer API** is a **third-party REST API** provided by **Kerykeion Astrology**.

* **Service Name:** Astrologer API  
* **Provider:** Kerykeion Astrology  
* **Protocol:** REST (OpenAPI 3.1.0)  
* **Version:** 4.0.0  
* **Primary Base URL (historical/typical):** https://astrologer.p.rapidapi.com/

### **1.1 Functional Role in This Project**

Within WovenWeb, the Astrologer API’s role is:

* **Function:** Provide **raw astrological geometry and chart data**, including:  
  * Birth charts  
  * Transit charts  
  * Synastry/composite charts  
  * Aspects and relationship scores  
* **Role in the System:** It is a **current, active data dependency**.  
  The app:  
  1. Collects subject data (birth info, coordinates, etc.).  
  2. Calls the Astrologer API (via an internal client).  
  3. Receives JSON with positions/aspects/houses.  
  4. Feeds that JSON into the **Astro Brain** pipeline.

The **geometry and chart semantics** come from the Astrologer API implementation, as described in astrologerAPI.docx (models like AstrologicalSubjectModel, BirthChartResponseModel, etc.).

## **2\. From "Hybrid Beast" to Pure Next.js**

What *is* legacy is not the Astrologer API itself, but the old way it was wired into the app.

### **2.1 Old Integration (Legacy)**

Previously, the architecture:

* Used Netlify Functions (e.g., netlify/functions/astrology-mathbrain.js).  
* Mixed static HTML \+ Next.js \+ Netlify routing.  
* Treated “AstrologerAPI” almost as a named top-level architectural layer.

This **integration pattern** is now considered **legacy**.

### **2.2 Current Integration (Pure Next.js)**

In the **Pure Next.js** architecture, the same external Astrologer API is still used, but it is now:

* Wrapped in an **internal module** of the Astro Brain.  
* Treated as a **vendor dependency**, not as part of the app’s public surface.  
* **Current Location:** src/math-brain/api-client.js (the “Transit Engine”)

This module:

* Calls the Astrologer API (or compatible Kerykeion endpoints).  
* Normalizes the upstream response into WovenWeb’s internal FIELD/MAP structures.  
* Is consumed only by the **Astro Brain**.

So:

* **Astrologer API (the service)** → *still current & in use*.  
* **“AstrologerAPI” as a named app-layer in the hybrid architecture** → *legacy integration pattern*.

## **3\. The App’s Own API (Canonical)**

When this project refers to **“the API”** in current documentation, it means the app’s **internal, canonical endpoint**, not the vendor service.

* **Canonical Endpoint (App API):** POST /api/astrology-mathbrain  
* **Specification:** API\_REFERENCE.md (ACC Spec v2)

### **3.1 Orchestration Flow**

The app’s API:

1. Receives the user’s **subject** and **settings**.  
2. Calls the **Astro Brain**, which:  
   * Internally calls the **Astrologer API** via src/math-brain/api-client.js.  
   * Processes and structures the geometry into ACC Spec v2 JSON.  
3. Passes that JSON to the **VOICE layer**, which calls the **Poetic Brain** (LLM).  
4. Returns a combined **JSON \+ markdown** report to the client.

From the frontend’s perspective, the only thing that matters is:

* POST /api/astrology-mathbrain → returns a complete report.

The Astrologer API remains a critical **external dependency**, but is now **fully encapsulated**.

## **4\. Summary Mapping**

| Term / File | What It Represents | Status in Current Architecture |
| :---- | :---- | :---- |
| **Astrologer API (Kerykeion)** | Third-party REST API providing astro geometry, charts, aspects, relationship scores. | **Active external dependency.** Still used by the Transit Engine inside Astro Brain. |
| **astrologerAPI.docx** | OpenAPI 3.1.0 specification (v4.0.0) for the Astrologer API, including models and endpoints. | **Authoritative vendor spec.** Reference for how the external service behaves. |
| **src/math-brain/api-client.js** | Internal **Transit Engine** module that calls the Astrologer API and normalizes its responses. | **Active internal module.** Private implementation detail of the Astro Brain. |
| **API\_REFERENCE.md** | The app’s **canonical API spec** for POST /api/astrology-mathbrain and the ACC Spec v2 JSON it returns. | **Active & authoritative.** This is the only API contract exposed by the app. |
