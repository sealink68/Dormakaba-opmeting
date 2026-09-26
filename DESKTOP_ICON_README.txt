Desktop icon installer

1. Put desktop_icon.bat in the GitHub repository or download it to the PC.
2. Double-click desktop_icon.bat.
3. Paste the full HTTPS GitHub Pages URL to index.html.

Optional unattended execution:
desktop_icon.bat "https://YOUR-NAME.github.io/YOUR-REPOSITORY/index.html"

The script downloads icon-180.png, icon-192.png and icon-512.png from the same web folder as index.html.
It tries to create C:\Dorma_icon. If Windows denies access, it automatically uses %%USERPROFILE%%\Dorma_icon, which does not require administrator rights.
It converts icon-512.png to icon-512.ico and creates "Opmeting  Mesure.url" on the current user's desktop.
