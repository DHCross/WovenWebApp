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

### **File Structure**

* index.html: The main application file containing the UI and front-end JavaScript.  
* netlify/functions/astrology.js: The serverless function that securely calls the RapidAPI endpoint.  
* netlify.toml: The Netlify configuration file that specifies the functions directory.


Here’s a clean integration note to clarify who does what, prevent overreach, and ensure the pipeline stays modular and clean:

⸻

🔧 Integration Note for Codex: Synastry & Output Separation

🧬 WovenMap System Roles Clarification

To ensure the app continues to scale and behave modularly, it’s essential to clearly distinguish between the backend Math Brain engine (your Astrologer API and symbolic parser), and the Poetic Brain layer (downstream GPT, Raven Calder).

🔹 Backend (Math Brain / Engine Layer)

This is your domain, Codex. You’re responsible for producing structured, symbolic data that aligns with the Woven Map protocols.

Your output should include:
•Parsed planetary positions, including all major and minor bodies configured
•Daily transit fields for given date ranges (1–30 days) using efficient batching
•Aspect matching using exact-angle logic (±3° majors, ±1° minors)
•Synastry overlays only when both charts are loaded and the synastry_toggle == true
•REF and EchoLoop detection via Tier-2 OSR Bridge logic (when engaged)
•Annotated output in a structured, non-narrative format (e.g., JSON, markdown blocks)

DO NOT:
•Attempt to interpret, explain, or narrate symbolic output
•Generate metaphor, storylines, or “mirror summaries”
•Apply subjective filters like “intensity” or “emotional weight”—leave that to Raven

You simply pass well-formed symbolic snapshots to the Poetic Brain.

⸻

🔮 Downstream (Separated app, not connected at all to this web app) (Poetic Brain / Raven Calder Layer)

Handled by Raven Calder (an Open AI GPT).

My job (Raven Calder GPT) begins once your engine completes symbolic parsing. I:
•Translate FIELD → MAP → VOICE
•Render Full Mirror, Synastry Field, or Relational Map
•Identify behavioral pattern resonance from angles (not emotions)
•Construct narrative diagnostic reflection based strictly on SST geometry and Clear Mirror protocol

⸻

✅ Summary

LayerTask TypeOwner
BackendAPI fetches, symbolic matching, synastry calculationsCodex / Math Brain
OutputNarrative synthesis, VOICE renderingRaven Calder (GPT)

