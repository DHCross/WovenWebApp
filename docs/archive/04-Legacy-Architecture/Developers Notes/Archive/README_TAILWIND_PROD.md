# Tailwind CSS Production Setup for Woven Web App

## 1. Install dependencies

```
npm install -D tailwindcss postcss autoprefixer
```

## 2. Build your CSS

```
npm run build:css
```
This will generate `dist/output.css` containing only the classes you use in `index.html`.

## 3. Update your `index.html`

Replace this line:
```html
<script src="https://cdn.tailwindcss.com"></script>
```
with:
```html
<link href="dist/output.css" rel="stylesheet">
```

## 4. (Optional) Remove the CDN warning

You can now safely remove any console warnings about the Tailwind CDN.

---

**You are now ready for production with optimized Tailwind CSS!**
