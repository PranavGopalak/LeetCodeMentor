# LeetMentor

LeetMentor is a local-first LeetCode study tracker with AI-assisted grading, schedule generation, mastery tracking, and spaced review.

Buy me a Coffee: [Sponsor](https://paypal.me/Gopalakumaran) · Contact: [pranavgopalakumaran@gmail.com](mailto:pranavgopalakumaran@gmail.com)

## 1. Get a free Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in.
3. Open `Get API key`.
4. Create a free API key.
5. Copy the key.

## 2. Find your LeetCode username

1. Open your LeetCode profile in the browser.
2. Copy the last part of the URL.

Example:

```text
https://leetcode.com/u/YOUR_USERNAME/
```

Your profile name is `YOUR_USERNAME`.

## 3. Install and run

```bash
npm install
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

For local development with hot reload:

```bash
npm run dev
```

## 4. Set up the app

1. Open `Settings`.
2. Paste your Gemini API key.
3. Enter your public LeetCode username.
4. Click `Save Settings`.

## 5. Use the app

1. Click `Start Session`.
2. Add problems as you solve them.
3. Rate each problem from `Bad` to `Perfect`.
4. Click `End Session & Get AI Schedule`.
5. Review the generated `Reinforcement` and `Foundation` list.

## Notes

- Your local app data is stored in the `data/` folder and is gitignored.
- Do not commit real API keys.
- If you ever shared or committed a real key before, rotate it in Google AI Studio.
