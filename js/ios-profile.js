/* Opmeting Mesure – iOS-knop: downloadt een .mobileconfig-profiel dat de app als webclip op het beginscherm zet. */
(() => {
  'use strict';
  const { $ } = Mesure;

  const ICON_BASE64 = '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';

  /** Bouw het .mobileconfig-profiel (webclip) voor de huidige URL. */
  function buildProfile(url, uuid) {
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<plist version="1.0">`,
      `<dict>`,
      `<key>PayloadContent</key>`,
      `<array>`,
      `<dict>`,
      `<key>FullScreen</key>`,
      `<true/>`,
      `<key>Icon</key>`,
      `<data>${ICON_BASE64}</data>`,
      `<key>Label</key>`,
      `<string>Opmeting Mesure</string>`,
      `<key>PayloadIdentifier</key>`,
      `<string>be.opmeting.webclip.${uuid}</string>`,
      `<key>PayloadType</key>`,
      `<string>com.apple.webClip.managed</string>`,
      `<key>PayloadUUID</key>`,
      `<string>${uuid}</string>`,
      `<key>PayloadVersion</key>`,
      `<integer>1</integer>`,
      `<key>URL</key>`,
      `<string>${url}</string>`,
      `</dict>`,
      `</array>`,
      `<key>PayloadDisplayName</key>`,
      `<string>Opmeting Mesure</string>`,
      `<key>PayloadIdentifier</key>`,
      `<string>be.opmeting.profile.${uuid}</string>`,
      `<key>PayloadType</key>`,
      `<string>Configuration</string>`,
      `<key>PayloadUUID</key>`,
      `<string>${uuid}</string>`,
      `<key>PayloadVersion</key>`,
      `<integer>1</integer>`,
      `</dict>`,
      `</plist>`
    ].join('');
  }

  function init() {
    $('btn-ios').addEventListener('click', () => {
      const uuid = crypto.randomUUID();
      const blob = new Blob([buildProfile(location.href, uuid)], { type: 'application/x-apple-aspen-config' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Opmeting_Mesure.mobileconfig';
      link.click();
    });
  }

  Mesure.iosProfile = { init, buildProfile };
})();
