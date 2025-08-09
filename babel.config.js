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
  plugins: [
    ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }],
    ['module:react-native-dotenv', { moduleName: '@env', path: '.env', safe: true }],
  ],
};
