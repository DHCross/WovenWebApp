# **Woven Map Report Generator (WovenWebApp)**

This is a web-based application designed to generate a detailed astrological report for a primary individual (Person A), with an optional second individual (Person B) for synastry and relationship analysis. It uses a static HTML and JavaScript front-end that communicates with a Netlify serverless function to fetch data from an external astrology API.

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