# **Woven Map Report Generator (WovenWebApp)**

This is a web-based application designed to generate a detailed astrological report for a primary individual (Person A), with an optional second individual (Person B) for synastry and relationship analysis. It uses a static HTML and JavaScript front-end that communicates with a Netlify serverless function to fetch data from an external astrology API. When a Person B is provided, you can toggle the **Include Synastry Analysis** checkbox to append synastry aspects and house overlays to the generated report.

## **Core Technology**

* **Front-End:** Plain HTML, JavaScript, and Tailwind CSS.  
* **Back-End:** A single serverless function (astrology.js) deployed on Netlify.  
* **External API:** [Astrologer API on RapidAPI](https://rapidapi.com/tg4-solutions-tg4-solutions-default/api/astrologer)

## **External API: Astrologer API**

This project relies on the Astrologer API to perform all astrological calculations.

### **Authentication**

All requests to the Astrologer API must include the following headers:

* X-RapidAPI-Key: Your personal API key.  
* X-RapidAPI-Host: astrologer.p.rapidapi.com

The serverless function is responsible for adding these headers to the outgoing request. The API key is stored as an environment variable in Netlify.

### **Primary Endpoint Used**

The application primarily interacts with the natal-aspects-data endpoint to get the core chart and aspect information for each person.

* **Method:** POST  
* **URL:** https://astrologer.p.rapidapi.com/api/v4/natal-aspects-data

#### **Request Body Structure**

The API expects a JSON object containing a subject key. The subject object must include the following fields:

{  
  "subject": {  
    "year": 1973,  
    "month": 7,  
    "day": 24,  
    "hour": 14,  
    "minute": 30,  
    "latitude": 40.0167,  
    "longitude": \-75.3167,  
    "timezone": "America/New\_York",  
    "city": "Bryn Mawr",  
    "nation": "US",  
    "name": "DH Cross",  
    "zodiac\_type": "Tropic"  
  }
}

> **Note**: The `nation` field must be a 2-letter country code following the ISO 3166-1 alpha-2 standard (e.g., `US`).

#### **Example JavaScript fetch Request**

This is how the front-end calls the Netlify function, which then calls the Astrologer API.

const subjectData \= {  
    year: 1973,  
    month: 7,  
    day: 24,  
    hour: 14,
    minute: 30,
    latitude: 40.0167,
    longitude: \-75.3167,
    timezone: "America/New\_York",  
    city: "Bryn Mawr",  
    nation: "US",  
    name: "DH Cross",  
    zodiac\_type": "Tropic"  
};

const getChartDataFromApi \= async (subject) \=\> {  
    const response \= await fetch('/.netlify/functions/astrology', {  
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({ subject: subject })  
    });

    if (\!response.ok) {  
        const errorData \= await response.json();  
        throw new Error(errorData.error || 'An unknown server error occurred.');  
    }

    return response.json();  
};

// Usage:  
// const chartData \= await getChartDataFromApi(subjectData);

#### **Success Response Structure**

A successful response from the API is a JSON object containing the status, the full data object for the subject, and a list of astrological aspects.

{  
  "status": "success",  
  "data": {  
    "subject": {  
      // ... extensive astrological data for the subject  
    }  
  },  
  "aspects": \[  
    {  
      "p1\_name": "Sun",  
      "p2\_name": "Moon",  
      "aspect": "trine",  
      "orbit": 2.5  
      // ... other aspect properties  
    }  
  \]  
}

## **Setup and Deployment**

This project is deployed on Netlify and linked to a GitHub repository.

### **Environment Variables**

To run this project, you must set the following environment variable in the Netlify site settings (Site settings \> Build & deploy \> Environment):

* **Key:** RAPIDAPI\_KEY  
* **Value:** Your secret key from RapidAPI for the Astrologer API.

### **Local Development Instructions**

To run this project locally using Netlify CLI:

1. Install [Node.js](https://nodejs.org/) (recommended version: 18.x or higher).
2. Install Netlify CLI (if not already installed):
   ```
   npm install -g netlify-cli
   ```
3. Create a `.env` file in the root of the project (optional) or set the environment variable in your shell:
   ```
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```
4. Start the local dev server:
   ```
   netlify dev
   ```

This will proxy requests to your serverless function and allow full front-end + back-end testing in development mode.

### **File Structure**

* index.html: The main application file containing the UI and front-end JavaScript.  
* netlify/functions/astrology.js: The serverless function that securely calls the RapidAPI endpoint.  
* netlify.toml: The Netlify configuration file that specifies the functions directory.
## 🌀 Raven Calder Synastry Glossary (for Poetic Brain Compatibility)

| Term | Definition |
| --- | --- |
| Bidirectional Aspect | Each synastry aspect must be rendered from both A→B and B→A perspectives. Required for narrative reflection generation. |
| Echo Loop | A dyadic repeating cycle formed by one or more synastry aspects under 3° orb, creating a self-reinforcing emotional or behavioral dynamic. |
| REF (Relational Echo Field) | A macro structure triggered when two or more Echo Loops converge around a shared theme. Flagged as REF-[PolarityCode] (e.g. REF-F21). |
| Polarity Code | A unique identifier linked to a specific dynamic type (e.g. F21 = "Frictional Attraction & Wound Trigger"). These come from the internal Symbolic Spectrum Table (SST). |
| Orb | The difference in degrees between the two planetary positions in an aspect. For majors: ±3°; for minors: ±1°. Exact math matters. |
| Geometry-First Diagnostic Rule | A Raven Calder system rule: all interpretations derive from exact planetary angle math, not archetype or psychological projection. |
| Angle | The precise degree of angular separation between two planetary bodies. Required for Raven’s FIELD → MAP → VOICE processing. |
| FIELD | The raw astrological data layer: charts, transits, aspects, orbs, houses. |
| MAP | The interpreted structural pattern of dynamics, such as Echo Loops, house overlays, or activated geometry. |
| VOICE | The narrative synthesis layer that generates journal-style outputs, symbolic interpretation, or mirrored dialogue. |
| synastry_id_hash | Optional: a unique identifier per synastry aspect or pair, used for tracing and cross-referencing in logs or modular journal building. |
| Daily Overlay Tracking | Optional timestamping of synastry aspects that are exact or activated on specific dates (e.g. in a Five-Day Synastry Field report). |
| Tier-2 OSR Bridge | A symbolic overlay logic system that connects dynamic field movement (transits) to static relationship geometry. Used in daily or week-range diagnostic field mapping. |

## **License**

This project is licensed under the [MIT License](LICENSE.txt).

