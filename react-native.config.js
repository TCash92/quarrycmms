module.exports = {
  dependencies: {
    // Disable autolinking for simdjson - the @morrowdigital/watermelondb-expo-plugin
    // handles adding this pod manually to avoid duplicate pod entries
    '@nozbe/simdjson': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
