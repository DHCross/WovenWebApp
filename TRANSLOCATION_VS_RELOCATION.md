# Translocation vs. Relocation: Architectural Distinction

## 🧭 Core Principle

In the Woven Map's Math Brain architecture, **translocation** and **relocation** serve different functional roles:

| Aspect | **Translocation** | **Relocation** |
|--------|-------------------|----------------|
| **Domain** | Math Brain (computational) | UI / User layer (narrative) |
| **Purpose** | Transform natal chart into new spatial reference frame | Describe human movement or perspective shift |
| **Effect** | Alters planetary house positions, angles, symbolic geometry | Metadata/context only; no direct computation |
| **API Key** | `translocation` | `relocation` |
| **Trigger** | Initiates coordinate transformation pipeline | Stored for display/context |
| **Analogy** | Coordinate transformation matrix in physics engine | Label in a travel log |

---

## 📐 How Translocation Works

When `translocation` is provided to Math Brain:

```json
{
  "translocation": {
    "applies": true,
    "method": "A_local",
    "coords": {
      "latitude": 30.1667,
      "longitude": -85.6667,
      "timezone": "America/Chicago"
    }
  }
}
```

The engine executes this pipeline:

1. **Cast natal chart** at birth location (Bryn Mawr, PA)
2. **Apply translocation**: Transform chart into observer frame at relocation site (Panama City, FL)
3. **Recalculate houses**: Recompute Ascendant, MC, house cusps for new horizon
4. **Recompute transits**: Calculate planetary angles relative to relocated angles
5. **Seismograph reflects relocated geometry**: Magnitude, Directional Bias, Volatility now represent the relocated experiential field

---

## 🔄 Why This Matters for Balance Meter

The **directional bias** of a Balance Meter reading is intimately tied to **house geometry**. 

- Transit aspects in different houses have different symbolic weight
- The Ascendant and MC anchors shift when translocation is applied
- A trine to natal Venus at relocated IC carries different pressure than the same aspect at natal IC

**Without translocation:** Chart uses natal Bryn Mawr houses → directional bias = **-2.0**  
**With translocation:** Chart uses relocated Panama City houses → directional bias = **-3.0 to -4.0** (crisis compression)

---

## ✅ Correct API Usage

### For computational relocation (affects geometry):
```json
{
  "translocation": {
    "applies": true,
    "method": "A_local",
    "coords": {
      "latitude": 30.1667,
      "longitude": -85.6667,
      "timezone": "America/Chicago"
    }
  }
}
```

### For narrative context (metadata only):
```json
{
  "relocation": {
    "city": "Panama City",
    "state": "FL",
    "latitude": 30.1667,
    "longitude": -85.6667
  }
}
```

---

## 📝 Summary

- **Relocation** = Biographical ("I'm here now")
- **Translocation** = Cartographic ("Compute the map as seen from here")
- Only `translocation` triggers geometric recomputation in Math Brain
- Both terms aligned conceptually, but only `translocation` affects seismograph metrics

---

**Philosophical:** Relocation tells the story; translocation tells the math.
