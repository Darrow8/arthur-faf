module.exports = {
  presets: [
    [
      'module:@react-native/babel-preset',
      {
        // Use modern automatic JSX transform for React 17+
        reactRuntime: 'automatic',
      },
    ],
  ],
  // No extra JSX transform plugin needed; handled by the preset above
};
