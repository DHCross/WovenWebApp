# **API Reference – WovenWebApp (ACC Spec v2)**

**Authoritative Schema – Pure Next.js Edition**

This document is the **immutable contract** for the WovenWebApp. It defines the canonical data structure that the [Astro Brain](https://www.google.com/search?q=ASTRO_BRAIN.md) (data pipeline) produces.

This is the *only* data shape the [Poetic Brain](https://www.google.com/search?q=POETIC_BRAIN.md) is allowed to receive.

All development *must* adhere to this schema. For the end-to-end flow, see [ARCHITECTURE\_OVERVIEW.md](https://www.google.com/search?q=ARCHITECTURE_OVERVIEW.md).

## **1\. Endpoint**

* **Method:** POST  
* **Path:** /api/astrology-mathbrain  
* **Reference:** app/api/astrology-mathbrain/route.ts (see [WOVENWEB\_CODEMAP.md](https://www.google.com/search?q=WOVENWEB_CODEMAP.md))

## **2\. Request Body**

The route.ts handler accepts a JSON object with two main keys.

{  
  "subject": {  
    "name": "string",  
    "year": 1980,  
    "month": 1,  
    "day": 1,  
    "hour": 12,  
    "minute": 0,  
    "timezone": "America/New\_York",  
    "latitude": 40.7128,  
    "longitude": \-74.0060  
  },  
  "settings": {  
    "start\_date": "YYYY-MM-DD",  
    "days": 7,  
    "zodiac\_type": "Tropic"  
  }  
}

* subject: The data for the primary person (or entity).  
* settings: The parameters for the Astro Brain's calculation.

## **3\. Successful Response Body (ACC Spec v2)**

This is the canonical output structure. The Astro Brain produces all fields *except* markdown. The route.ts handler adds the markdown field after the [Poetic Brain](https://www.google.com/search?q=POETIC_BRAIN.md) handoff.

{  
  "daily\_entries": \[  
    {  
      "date": "YYYY-MM-DD",  
      "seismograph\_metrics": {  
        "magnitude": "number",  
        "directional\_bias": "string",  
        "volatility": "number"  
      },  
      "interpretation\_tags": \["string"\],  
      "mirror\_data": {  
        /\* ... detailed mirror object ... \*/  
      },  
      "raw\_geometry": {  
        /\* ... raw transit/house data ... \*/  
      }  
    }  
  \],  
  "mirror\_data": {  
    /\* ... summary mirror object ... \*/  
  },  
  "aggregate\_scores": {  
    "total\_magnitude": "number",  
    "average\_volatility": "number",  
    "bias\_profile": \[  
      { "bias": "string", "count": "number" }  
    \]  
  },  
  "field\_map": {  
    /\* ... raw FIELD layer output ... \*/  
  },  
  "markdown": "string"  
}

## **4\. Field Definitions (The Contract)**

### **daily\_entries (Array)**

* **Source:** Astro Brain  
* **Description:** The core data array, with one object per requested day. This is the primary data used by the [Poetic Brain](https://www.google.com/search?q=POETIC_BRAIN.md).  
* **Guardrail:** If this array is empty, markdown will not be generated. (See [DEVELOPER\_GUIDE.md](https://www.google.com/search?q=DEVELOPER_GUIDE.md)).

### **daily\_entries\[\].seismograph\_metrics (Object)**

* **Source:** Astro Brain (seismograph-engine.js)  
* **Description:** The calculated "vibe" for the day.  
  * magnitude: Intensity of symbolic pressure.  
  * directional\_bias: The nature of the pressure (e.g., "Strain," "Support," "Flow").  
  * volatility: The stability of the symbolic field.

### **daily\_entries\[\].interpretation\_tags (Array)**

* **Source:** Astro Brain (interpretation/)  
* **Description:** An array of objective keywords (e.g., \["Theme\_Power", "Theme\_Conflict"\]). **Contains no narrative.**

### **mirror\_data (Object \- Root Level)**

* **Source:** Astro Brain / route.ts  
* **Description:** The summary mirror\_data object for the *entire report*.  
* **Guardrail:** This object *must* be derived from the **last valid entry** in the daily\_entries array (i.e., daily\_entries.at(-1)). See [WOVENWEB\_CODEMAP.md](https://www.google.com/search?q=WOVENWEB_CODEMAP.md).

### **aggregate\_scores (Object)**

* **Source:** Astro Brain  
* **Description:** A high-level summary of all metrics across the entire date range.

### **field\_map (Object)**

* **Source:** Astro Brain (FIELD Layer)  
* **Description:** The raw, organized geometric data.

### **markdown (String)**

* **Source:** [Poetic Brain](https://www.google.com/search?q=POETIC_BRAIN.md) (via the VOICE layer)  
* **Description:** The final, human-readable narrative string.  
* **Guardrail:** This field is generated *last* and added to the response by the route.ts handler. See [NARRATIVE\_LAYER\_INTEGRATION.md](https://www.google.com/search?q=NARRATIVE_LAYER_INTEGRATION.md).