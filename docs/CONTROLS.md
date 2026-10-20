# Café controls and service

Run npm run dev from the repository root. The desktop game uses WASD to walk, mouse/arrows to look, E to interact, J for field notes and Escape to pause. Existing saves resume with Continue café.

1. Welcome the customer using a Japanese phrase, listen, select both drink and quantity, and repeat the order.
2. Follow the marker through the recipe. Coffee needs grinding, tamping, attachment and extraction. Tea needs a filled/heated kettle, measured leaves, hot water and steeping. Water needs a clean glass and pitcher.
3. Take clean cups, pour where required, and move finished drinks onto the tray. Press 1/2 to set the teapot batch before measuring leaves. The tray holds two cups.
4. Offer the tray with the appropriate Japanese phrase. Incorrect drinks return with forgiving feedback; Haru handles day-one cleanup.
5. At the till, choose the thank-you phrase, enter or select the bill, and count change. Water is free.
6. From day two, hold E at the sink to wash returned vessels. From day three, refill tea and coffee freely at the pantry. These tasks are available between customers too.
7. Return equipment, wash remaining cups and wipe the counter before closing the till.

Hold E for pours, washing and wiping. Interruptions retain partial work. Ordinary completed drinks always work; release in green for optional perfect-cup tips. Coffee runs automatically once extraction starts. Heating and steeping continue while you tidy and freeze when play pauses.

H reveals the current preparation meaning; L listens. Order words and Japanese phrase choices have kana and optional romaji. English fades after supported practice and remains available on request. The notebook offers Always show Japanese meanings and readings. Asking for help does not reduce friendship.

Chapter One ends after seven days at the reading evening, with an optional Japanese comprehension check. Keep running the café continues to day eight with relationships and learning intact. Chapter Two remains a teaser.

Run npm run typecheck, npm run lint, npm test and npm run build. Recipe/state coverage is in tests/cafe-service.test.cjs; browser QA is tests/browser/preparation.cjs. Browser fixtures use an isolated Playwright context and development-only camera positioning.
